import { callGeminiJson } from "./geminiClient.js";
import { config } from "./config.js";
import { extractJsonFromText } from "./utils/jsonUtils.js";

const OLLAMA_TIMEOUT_MS = 120_000;

const ollamaBaseUrl = () => config.ollamaUrl.trim().replace(/\/+$/, "");

const callOllamaJson = async ({ systemPrompt, input }) => {
  const baseUrl = ollamaBaseUrl();
  if (!baseUrl) {
    throw new Error("OLLAMA_URL not set");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.ollamaModel,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(input, null, 2) }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Ollama HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = data?.message?.content || "";
    const parsed = extractJsonFromText(text);
    if (!parsed) {
      throw new Error("Ollama returned malformed JSON");
    }

    return parsed;
  } finally {
    clearTimeout(timer);
  }
};

export const callLlmJson = async ({
  systemPrompt,
  input,
  fallback,
  callGemini = callGeminiJson
}) => {
  if (config.demoMode) {
    return fallback;
  }

  try {
    const parsed = await callOllamaJson({ systemPrompt, input });
    console.log(`[llm] JSON response via ollama (${config.ollamaModel})`);
    return parsed;
  } catch (error) {
    console.warn(
      "[llm] Ollama JSON call failed, falling back to Gemini:",
      error instanceof Error ? error.message : error
    );
  }

  return callGemini({ systemPrompt, input, fallback });
};
