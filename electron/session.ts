export type ChatRole = "user" | "model";

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

export interface SessionStateSnapshot {
  session: {
    active: boolean;
    elapsedMs: number;
    paused: boolean;
  };
  break: {
    active: boolean;
    msRemaining: number;
    forKeyword?: string;
  };
}

interface InternalState {
  session: {
    active: boolean;
    startedAt: number | null;
    pausedAt: number | null;
    totalPausedMs: number;
  };
  break: {
    active: boolean;
    endsAt: number | null;
    forKeyword: string | null;
  };
  graces: Record<string, number>;
  conversationHistory: ChatMessage[];
  currentLockKeyword: string | null;
}

const state: InternalState = {
  session: { active: false, startedAt: null, pausedAt: null, totalPausedMs: 0 },
  break: { active: false, endsAt: null, forKeyword: null },
  graces: {},
  conversationHistory: [],
  currentLockKeyword: null,
};

export function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return 1;
  return Math.max(1, Math.min(20, Math.floor(minutes)));
}

export function startSession() {
  state.session.active = true;
  state.session.startedAt = Date.now();
  state.session.pausedAt = null;
  state.session.totalPausedMs = 0;
  state.break = { active: false, endsAt: null, forKeyword: null };
  state.graces = {};
  state.conversationHistory = [];
  state.currentLockKeyword = null;
}

export function stopSession() {
  state.session = {
    active: false,
    startedAt: null,
    pausedAt: null,
    totalPausedMs: 0,
  };
  state.break = { active: false, endsAt: null, forKeyword: null };
  state.graces = {};
  state.conversationHistory = [];
  state.currentLockKeyword = null;
}

export function isSessionActive(): boolean {
  return state.session.active;
}

export function pauseForNegotiation(keyword: string) {
  if (state.session.pausedAt === null) {
    state.session.pausedAt = Date.now();
  }
  state.currentLockKeyword = keyword;
  state.conversationHistory = [];
}

export function resumeFromNegotiation() {
  if (state.session.pausedAt !== null) {
    state.session.totalPausedMs += Date.now() - state.session.pausedAt;
    state.session.pausedAt = null;
  }
  state.currentLockKeyword = null;
}

export function grantBreak(keyword: string, minutes: number) {
  const clamped = clampMinutes(minutes);
  state.break.active = true;
  state.break.endsAt = Date.now() + clamped * 60 * 1000;
  state.break.forKeyword = keyword;
  state.currentLockKeyword = null;
}

export function endBreak() {
  if (state.session.pausedAt !== null) {
    state.session.totalPausedMs += Date.now() - state.session.pausedAt;
    state.session.pausedAt = null;
  }
  state.break = { active: false, endsAt: null, forKeyword: null };
  state.conversationHistory = [];
}

export function isBreakExpired(): boolean {
  return (
    state.break.active &&
    state.break.endsAt !== null &&
    Date.now() >= state.break.endsAt
  );
}

export function isBreakActive(): boolean {
  return state.break.active;
}

export function setGrace(keyword: string, ms: number) {
  state.graces[keyword] = Date.now() + ms;
}

export function isInGrace(keyword: string): boolean {
  const expiry = state.graces[keyword];
  return typeof expiry === "number" && expiry > Date.now();
}

export function currentLockKeyword(): string | null {
  return state.currentLockKeyword;
}

export function appendUserMessage(text: string) {
  state.conversationHistory.push({ role: "user", text });
}

export function appendModelMessage(text: string) {
  state.conversationHistory.push({ role: "model", text });
}

export function getHistory(): ChatMessage[] {
  return state.conversationHistory.slice();
}

export function snapshot(): SessionStateSnapshot {
  const now = Date.now();
  const { session, break: br } = state;

  let elapsedMs = 0;
  if (session.active && session.startedAt !== null) {
    elapsedMs = now - session.startedAt - session.totalPausedMs;
    if (session.pausedAt !== null) {
      elapsedMs -= now - session.pausedAt;
    }
    if (elapsedMs < 0) elapsedMs = 0;
  }

  const msRemaining =
    br.active && br.endsAt !== null ? Math.max(0, br.endsAt - now) : 0;

  return {
    session: {
      active: session.active,
      elapsedMs,
      paused: session.pausedAt !== null,
    },
    break: {
      active: br.active,
      msRemaining,
      forKeyword: br.forKeyword ?? undefined,
    },
  };
}
