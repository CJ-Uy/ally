// Unified LLM provider: Ollama-first with Gemini fallback.
//
// Reads OLLAMA_URL + OLLAMA_MODEL from env. Tries Ollama for every call; on
// network error, timeout, empty content, or any thrown error, falls back to
// Gemini (GEMINI_API_KEY + the model returned by modelFor(slot)).

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  FunctionCallingMode,
  GoogleGenerativeAI,
  type FunctionDeclaration,
} from "@google/generative-ai";
import { modelFor, type AgentSlot } from "./models";

// Overall budget for a single Ollama call. We stream every request, so
// Cloudflare's ~100 s idle ceiling (HTTP 524) is sidestepped as long as the
// model keeps emitting tokens — this can safely be minutes.
const OLLAMA_TIMEOUT_MS = 300_000;
// If the stream goes silent for this long mid-response, abort. Catches a
// stalled tunnel without forcing the whole budget to elapse.
const OLLAMA_IDLE_TIMEOUT_MS = 60_000;
const PING_TIMEOUT_MS = 4_000;

function ollamaOnly(): boolean {
  return process.env.LLM_PROVIDER?.trim().toLowerCase() === "ollama";
}

interface OllamaStreamChunk {
  message?: {
    content?: string;
    tool_calls?: OllamaToolCall[];
  };
  done?: boolean;
}

interface OllamaStreamResult {
  content: string;
  toolCalls: OllamaToolCall[];
}

interface OllamaToolCall {
  function?: { name?: string; arguments?: string | Record<string, unknown> };
}

// Streams a /api/chat response, accumulating message.content across chunks
// and capturing any tool_calls seen. Resets the idle abort on each chunk so
// long generations stay alive as long as bytes keep flowing.
async function streamOllamaChat(
  url: string,
  body: Record<string, unknown>,
): Promise<OllamaStreamResult> {
  const overall = new AbortController();
  const overallTimer = setTimeout(() => overall.abort(), OLLAMA_TIMEOUT_MS);
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  const resetIdle = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => overall.abort(), OLLAMA_IDLE_TIMEOUT_MS);
  };
  resetIdle();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, stream: true }),
      signal: overall.signal,
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Ollama HTTP ${res.status}: ${errBody.slice(0, 200)}`);
    }
    if (!res.body) throw new Error("Ollama returned no response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    const toolCalls: OllamaToolCall[] = [];

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      resetIdle();
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);
        if (!line) continue;
        let chunk: OllamaStreamChunk;
        try {
          chunk = JSON.parse(line) as OllamaStreamChunk;
        } catch {
          continue;
        }
        if (chunk.message?.content) content += chunk.message.content;
        if (chunk.message?.tool_calls?.length) {
          toolCalls.push(...chunk.message.tool_calls);
        }
      }
    }

    const tail = buffer.trim();
    if (tail) {
      try {
        const chunk = JSON.parse(tail) as OllamaStreamChunk;
        if (chunk.message?.content) content += chunk.message.content;
        if (chunk.message?.tool_calls?.length) {
          toolCalls.push(...chunk.message.tool_calls);
        }
      } catch {
        /* ignore truncated tail */
      }
    }

    return { content, toolCalls };
  } finally {
    clearTimeout(overallTimer);
    if (idleTimer) clearTimeout(idleTimer);
  }
}

export type Provider = "ollama" | "gemini";

export interface ProviderStatus {
  provider: Provider;
  alive: boolean;
  latencyMs: number | null;
  model?: string;
  endpoint?: string;
  error?: string;
}

export type ChatRole = "user" | "model";
export interface UnifiedMessage {
  role: ChatRole;
  text: string;
}

// ── env helpers ──────────────────────────────────────────────────────────

function ollamaBase(): string | null {
  const url = process.env.OLLAMA_URL?.trim();
  if (!url) return null;
  return url.replace(/\/$/, "");
}

function ollamaModel(): string {
  // qwen2.5:7b is the default because qwen3.5's "thinking" CoT regularly
  // overruns the Cloudflare 100 s budget on JSON/tool prompts.
  return process.env.OLLAMA_MODEL?.trim() || "qwen2.5:7b";
}

// ── health ──────────────────────────────────────────────────────────────

export async function pingOllama(): Promise<ProviderStatus> {
  const base = ollamaBase();
  const model = ollamaModel();
  if (!base) {
    return {
      provider: "ollama",
      alive: false,
      latencyMs: null,
      model,
      error: "OLLAMA_URL not set",
    };
  }
  const started = Date.now();
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), PING_TIMEOUT_MS);
    const res = await fetch(`${base}/api/tags`, { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return {
        provider: "ollama",
        alive: false,
        latencyMs: Date.now() - started,
        model,
        endpoint: base,
        error: `HTTP ${res.status}`,
      };
    }
    return {
      provider: "ollama",
      alive: true,
      latencyMs: Date.now() - started,
      model,
      endpoint: base,
    };
  } catch (err) {
    return {
      provider: "ollama",
      alive: false,
      latencyMs: Date.now() - started,
      model,
      endpoint: base,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function pingGemini(): Promise<ProviderStatus> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL_DEFAULT?.trim() || "gemini-2.5-flash";
  if (!apiKey) {
    return {
      provider: "gemini",
      alive: false,
      latencyMs: null,
      model,
      error: "GEMINI_API_KEY not set",
    };
  }
  const started = Date.now();
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), PING_TIMEOUT_MS);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${apiKey}`,
      { signal: ctl.signal },
    );
    clearTimeout(timer);
    if (!res.ok) {
      return {
        provider: "gemini",
        alive: false,
        latencyMs: Date.now() - started,
        model,
        endpoint: "generativelanguage.googleapis.com",
        error: `HTTP ${res.status}`,
      };
    }
    return {
      provider: "gemini",
      alive: true,
      latencyMs: Date.now() - started,
      model,
      endpoint: "generativelanguage.googleapis.com",
    };
  } catch (err) {
    return {
      provider: "gemini",
      alive: false,
      latencyMs: Date.now() - started,
      model,
      endpoint: "generativelanguage.googleapis.com",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function getAiStatus(): Promise<{
  ollama: ProviderStatus;
  gemini: ProviderStatus;
}> {
  const [ollama, gemini] = await Promise.all([pingOllama(), pingGemini()]);
  return { ollama, gemini };
}

// ── gemini client ───────────────────────────────────────────────────────

let geminiClient: GoogleGenerativeAI | null = null;
function getGemini(): GoogleGenerativeAI {
  if (geminiClient) return geminiClient;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  geminiClient = new GoogleGenerativeAI(key);
  return geminiClient;
}

// ── schema conversion (Gemini FunctionDeclaration → JSON Schema) ────────

// SchemaType in @google/generative-ai is already lowercase string values, but
// some hand-written code may use uppercase. Normalize to JSON Schema lowercase.
const SCHEMA_TYPE_NORMALIZE: Record<string, string> = {
  STRING: "string",
  NUMBER: "number",
  INTEGER: "integer",
  BOOLEAN: "boolean",
  ARRAY: "array",
  OBJECT: "object",
};

function convertSchema(s: unknown): unknown {
  if (!s || typeof s !== "object") return s;
  const src = s as Record<string, unknown>;
  const out: Record<string, unknown> = { ...src };
  if (typeof out.type === "string") {
    out.type = SCHEMA_TYPE_NORMALIZE[out.type] ?? out.type.toLowerCase();
  }
  if (out.properties && typeof out.properties === "object") {
    const np: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(
      out.properties as Record<string, unknown>,
    )) {
      np[k] = convertSchema(v);
    }
    out.properties = np;
  }
  if (out.items) out.items = convertSchema(out.items);
  return out;
}

function toOllamaTools(decls: FunctionDeclaration[]): unknown[] {
  return decls.map((d) => ({
    type: "function",
    function: {
      name: d.name,
      description: d.description ?? "",
      parameters:
        convertSchema(d.parameters ?? { type: "object", properties: {} }) ?? {
          type: "object",
          properties: {},
        },
    },
  }));
}

// ── plain generate (used by syllabus + pretest) ─────────────────────────

export interface GenerateOpts {
  slot: AgentSlot;
  system: string;
  prompt: string;
  json?: boolean;
  // For PDF inputs: pass an absolute (or app-relative) path. Ollama path will
  // extract the text first; Gemini path uploads the raw bytes inline.
  pdfPath?: string;
}

async function pdfToText(filePath: string): Promise<string> {
  // pdf-parse@2.x is ESM-only and exposes a `PDFParse` class (no default
  // function export). v1's `parse(buffer)` form is gone — calling it bundled
  // produced "parse2 is not a function" at runtime.
  const mod = (await import("pdf-parse")) as { PDFParse?: unknown } & {
    default?: { PDFParse?: unknown };
  };
  const PDFParseCtor = (mod.PDFParse ?? mod.default?.PDFParse) as
    | (new (opts: { data: Uint8Array }) => {
        getText: () => Promise<{ text: string }>;
        destroy: () => Promise<void>;
      })
    | undefined;
  if (!PDFParseCtor) {
    throw new Error("pdf-parse: PDFParse class not found on module exports");
  }

  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
  const buf = readFileSync(abs);
  // PDF.js takes ownership of the buffer it receives, so hand it a fresh copy
  // to avoid corrupting Node's underlying Buffer pool.
  const data = new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const parser = new PDFParseCtor({ data });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function ollamaGenerate(
  system: string,
  prompt: string,
  json: boolean,
): Promise<string> {
  const base = ollamaBase();
  if (!base) throw new Error("OLLAMA_URL not set");
  const { content } = await streamOllamaChat(`${base}/api/chat`, {
    model: ollamaModel(),
    // think:false suppresses qwen3.x's verbose chain-of-thought so the model
    // returns its final answer directly. No-op for qwen2.5 etc.
    think: false,
    ...(json ? { format: "json" } : {}),
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });
  if (!content.trim()) throw new Error("Ollama returned empty content");
  return content;
}

async function geminiGenerate(opts: GenerateOpts): Promise<string> {
  const model = getGemini().getGenerativeModel({
    model: modelFor(opts.slot),
    systemInstruction: opts.system,
    ...(opts.json
      ? { generationConfig: { responseMimeType: "application/json" } }
      : {}),
  });
  if (opts.pdfPath) {
    const abs = path.isAbsolute(opts.pdfPath)
      ? opts.pdfPath
      : path.resolve(opts.pdfPath);
    const b64 = readFileSync(abs).toString("base64");
    const result = await model.generateContent([
      { inlineData: { data: b64, mimeType: "application/pdf" } },
      { text: opts.prompt },
    ]);
    return result.response.text();
  }
  const result = await model.generateContent(opts.prompt);
  return result.response.text();
}

export async function generate(
  opts: GenerateOpts,
): Promise<{ text: string; provider: Provider }> {
  // Try Ollama first.
  try {
    let prompt = opts.prompt;
    if (opts.pdfPath) {
      const text = await pdfToText(opts.pdfPath);
      prompt = `${opts.prompt}\n\n=== EXTRACTED PDF TEXT ===\n${text}`;
    }
    const text = await ollamaGenerate(opts.system, prompt, !!opts.json);
    console.log(`[llm] generate via ollama (slot=${opts.slot})`);
    return { text, provider: "ollama" };
  } catch (err) {
    if (ollamaOnly()) {
      throw err;
    }
    console.warn(
      `[llm] ollama generate failed, falling back to gemini:`,
      err instanceof Error ? err.message : err,
    );
  }
  const text = await geminiGenerate(opts);
  console.log(`[llm] generate via gemini (slot=${opts.slot})`);
  return { text, provider: "gemini" };
}

// ── plain chat (no tools, used by break-negotiation) ────────────────────

export interface ChatOpts {
  slot: AgentSlot;
  system: string;
  history: UnifiedMessage[];
  message: string;
}

async function ollamaChat(opts: ChatOpts): Promise<string> {
  const base = ollamaBase();
  if (!base) throw new Error("OLLAMA_URL not set");
  const messages = [
    { role: "system", content: opts.system },
    ...opts.history.map((m) => ({
      role: m.role === "model" ? "assistant" : "user",
      content: m.text,
    })),
    { role: "user", content: opts.message },
  ];
  const { content } = await streamOllamaChat(`${base}/api/chat`, {
    model: ollamaModel(),
    think: false,
    messages,
  });
  if (!content.trim()) throw new Error("Ollama returned empty content");
  return content;
}

async function geminiChat(opts: ChatOpts): Promise<string> {
  const model = getGemini().getGenerativeModel({
    model: modelFor(opts.slot),
    systemInstruction: opts.system,
  });
  const chat = model.startChat({
    history: opts.history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
  });
  const result = await chat.sendMessage(opts.message);
  return result.response.text();
}

export async function chat(
  opts: ChatOpts,
): Promise<{ text: string; provider: Provider }> {
  try {
    const text = await ollamaChat(opts);
    console.log(`[llm] chat via ollama (slot=${opts.slot})`);
    return { text, provider: "ollama" };
  } catch (err) {
    if (ollamaOnly()) {
      throw err;
    }
    console.warn(
      `[llm] ollama chat failed, falling back to gemini:`,
      err instanceof Error ? err.message : err,
    );
  }
  const text = await geminiChat(opts);
  console.log(`[llm] chat via gemini (slot=${opts.slot})`);
  return { text, provider: "gemini" };
}

// ── chat with tools (planner) ───────────────────────────────────────────

export interface ChatWithToolsOpts {
  slot: AgentSlot;
  system: string;
  history: UnifiedMessage[];
  message: string;
  tools: FunctionDeclaration[];
  runTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  maxIterations: number;
}

async function ollamaChatWithTools(opts: ChatWithToolsOpts): Promise<string> {
  const base = ollamaBase();
  if (!base) throw new Error("OLLAMA_URL not set");
  const tools = toOllamaTools(opts.tools);
  const messages: Array<Record<string, unknown>> = [
    { role: "system", content: opts.system },
    ...opts.history.map((m) => ({
      role: m.role === "model" ? "assistant" : "user",
      content: m.text,
    })),
    { role: "user", content: opts.message },
  ];

  for (let i = 0; i <= opts.maxIterations; i++) {
    const { content: msgContent, toolCalls: calls } = await streamOllamaChat(
      `${base}/api/chat`,
      {
        model: ollamaModel(),
        think: false,
        messages,
        tools,
      },
    );

    if (calls.length === 0) {
      const text = msgContent.trim();
      if (!text) {
        throw new Error("Ollama returned empty content with no tool calls");
      }
      return text;
    }

    console.log(
      `[llm/ollama] iter ${i}: ${calls.length} tool call(s) → ${calls
        .map((c) => c.function?.name)
        .join(", ")}`,
    );
    messages.push({
      role: "assistant",
      content: msgContent,
      tool_calls: calls,
    });
    for (const c of calls) {
      const name = c.function?.name ?? "";
      let args: Record<string, unknown> = {};
      const raw = c.function?.arguments;
      try {
        args =
          typeof raw === "string"
            ? (JSON.parse(raw) as Record<string, unknown>)
            : ((raw ?? {}) as Record<string, unknown>);
      } catch {
        args = {};
      }
      try {
        const result = await opts.runTool(name, args);
        messages.push({
          role: "tool",
          content: JSON.stringify(result),
        });
      } catch (toolErr) {
        messages.push({
          role: "tool",
          content: JSON.stringify({
            error:
              toolErr instanceof Error ? toolErr.message : String(toolErr),
          }),
        });
      }
    }
  }
  throw new Error("Ollama tool loop exceeded max iterations");
}

async function geminiChatWithTools(opts: ChatWithToolsOpts): Promise<string> {
  const model = getGemini().getGenerativeModel({
    model: modelFor(opts.slot),
    systemInstruction: opts.system,
    tools: [{ functionDeclarations: opts.tools }],
    toolConfig: {
      functionCallingConfig: { mode: FunctionCallingMode.AUTO },
    },
  });

  const chat = model.startChat({
    history: opts.history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
  });

  const SEND_OPTS = { timeout: 30_000 };
  let response = await chat.sendMessage(opts.message, SEND_OPTS);

  for (let i = 0; i < opts.maxIterations; i++) {
    const calls = response.response.functionCalls();
    if (!calls || calls.length === 0) break;
    console.log(
      `[llm/gemini] iter ${i}: ${calls.length} tool call(s) → ${calls
        .map((c) => c.name)
        .join(", ")}`,
    );
    const responses: Array<{
      functionResponse: { name: string; response: Record<string, unknown> };
    }> = [];
    for (const c of calls) {
      try {
        const result = await opts.runTool(
          c.name,
          (c.args ?? {}) as Record<string, unknown>,
        );
        responses.push({
          functionResponse: { name: c.name, response: { result } },
        });
      } catch (toolErr) {
        responses.push({
          functionResponse: {
            name: c.name,
            response: {
              result: {
                error:
                  toolErr instanceof Error
                    ? toolErr.message
                    : String(toolErr),
              },
            },
          },
        });
      }
    }
    response = await chat.sendMessage(responses, SEND_OPTS);
  }

  const text = response.response.text();
  if (!text.trim()) {
    const candidate = response.response.candidates?.[0];
    const finishReason = candidate?.finishReason ?? "UNKNOWN";
    if (finishReason === "SAFETY" || finishReason === "RECITATION") {
      return `Gemini blocked the response (${finishReason}). Try rephrasing.`;
    }
    if (finishReason === "MAX_TOKENS") {
      return `Gemini ran out of tokens before finishing. Try a shorter request.`;
    }
    return `Gemini returned an empty response (finishReason: ${finishReason}).`;
  }
  return text.trim();
}

export async function chatWithTools(
  opts: ChatWithToolsOpts,
): Promise<{ text: string; provider: Provider }> {
  try {
    const text = await ollamaChatWithTools(opts);
    console.log(`[llm] chatWithTools via ollama (slot=${opts.slot})`);
    return { text, provider: "ollama" };
  } catch (err) {
    if (ollamaOnly()) {
      throw err;
    }
    console.warn(
      `[llm] ollama chatWithTools failed, falling back to gemini:`,
      err instanceof Error ? err.message : err,
    );
  }
  const text = await geminiChatWithTools(opts);
  console.log(`[llm] chatWithTools via gemini (slot=${opts.slot})`);
  return { text, provider: "gemini" };
}
