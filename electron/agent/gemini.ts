import { GoogleGenerativeAI } from "@google/generative-ai";
import { agentConfig } from "./config";
import { buildLiveContext, formatContext, readMockContext } from "./context";
import { modelFor } from "./models";
import type { ChatMessage } from "../session";
import { clampMinutes } from "../session";

const DECISION_LINE_RE = /^DECISION:\s*(\{[^\n]*\})\s*$/m;

export interface AgentDecision {
  granted: boolean;
  minutes?: number;
}

export interface AgentReply {
  visibleText: string;
  decision?: AgentDecision;
}

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  client = new GoogleGenerativeAI(apiKey);
  return client;
}

function parseDecision(text: string): { stripped: string; decision?: AgentDecision } {
  const match = text.match(DECISION_LINE_RE);
  if (!match) return { stripped: text };

  try {
    const parsed = JSON.parse(match[1]) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return { stripped: text.replace(DECISION_LINE_RE, "").trim() };
    }
    const obj = parsed as { granted?: unknown; minutes?: unknown };
    if (typeof obj.granted !== "boolean") {
      return { stripped: text.replace(DECISION_LINE_RE, "").trim() };
    }

    const decision: AgentDecision = { granted: obj.granted };
    if (obj.granted) {
      const raw = typeof obj.minutes === "number" ? obj.minutes : 1;
      decision.minutes = clampMinutes(raw);
    }

    return {
      stripped: text.replace(DECISION_LINE_RE, "").trim(),
      decision,
    };
  } catch {
    return { stripped: text.replace(DECISION_LINE_RE, "").trim() };
  }
}

async function loadContextBlock(): Promise<string> {
  try {
    const live = await buildLiveContext();
    return formatContext(live);
  } catch (err) {
    console.warn("[gemini] live context failed, falling back to mock:", err);
    return formatContext(readMockContext());
  }
}

export async function sendToAgent(
  history: ChatMessage[],
  userMessage: string,
): Promise<AgentReply> {
  try {
    const contextBlock = await loadContextBlock();
    const systemInstruction = `${agentConfig.instructions}\n\n${contextBlock}`;

    const model = getClient().getGenerativeModel({
      model: modelFor("negotiation"),
      systemInstruction,
    });

    const chat = model.startChat({
      history: history.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
    });

    const result = await chat.sendMessage(userMessage);
    const text = result.response.text();
    const { stripped, decision } = parseDecision(text);

    return {
      visibleText: stripped.length > 0 ? stripped : "…",
      decision,
    };
  } catch (err) {
    console.error("[gemini] error:", err);
    return {
      visibleText: "Agent unavailable, try again.",
    };
  }
}
