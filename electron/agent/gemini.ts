import { agentConfig } from "./config";
import { buildLiveContext, formatContext, readMockContext } from "./context";
import { chat as llmChat } from "./llm";
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
    console.warn("[agent] live context failed, falling back to mock:", err);
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

    const { text, provider } = await llmChat({
      slot: "negotiation",
      system: systemInstruction,
      history,
      message: userMessage,
    });
    console.log(`[agent] reply via ${provider}`);
    const { stripped, decision } = parseDecision(text);

    return {
      visibleText: stripped.length > 0 ? stripped : "…",
      decision,
    };
  } catch (err) {
    console.error("[agent] error:", err);
    return {
      visibleText: "Agent unavailable, try again.",
    };
  }
}
