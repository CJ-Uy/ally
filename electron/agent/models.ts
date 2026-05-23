// Centralized model selection for every Gemini agent in the app.
//
// Per-task env vars take precedence; GEMINI_MODEL_DEFAULT overrides them all
// when you want a single global swap (e.g. "gemini-2.5-flash-lite" while the
// free-tier quota is exhausted). Hardcoded fallback is gemini-2.5-flash.

export type AgentSlot = "negotiation" | "parser" | "planner" | "pretest";

const ENV_KEY: Record<AgentSlot, string> = {
  negotiation: "GEMINI_MODEL_NEGOTIATION",
  parser: "GEMINI_MODEL_PARSER",
  planner: "GEMINI_MODEL_PLANNER",
  pretest: "GEMINI_MODEL_PRETEST",
};

const FALLBACK = "gemini-2.5-flash";

const logged = new Set<AgentSlot>();

export function modelFor(slot: AgentSlot): string {
  const perTask = process.env[ENV_KEY[slot]]?.trim();
  const fallback = process.env.GEMINI_MODEL_DEFAULT?.trim() || FALLBACK;
  const chosen = perTask && perTask.length > 0 ? perTask : fallback;
  if (!logged.has(slot)) {
    console.log(`[models] ${slot} → ${chosen}`);
    logged.add(slot);
  }
  return chosen;
}
