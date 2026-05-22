import { readFileSync } from "node:fs";
import path from "node:path";
import {
  currentLockKeyword,
  endBreak,
  isBreakActive,
  isBreakExpired,
  isInGrace,
  isSessionActive,
  pauseForNegotiation,
} from "./session";

const POLL_MS = 1500;
const BREAK_TICK_MS = 1000;

interface Blocklist {
  keywords: string[];
}

let blocklistCache: Blocklist | null = null;

function loadBlocklist(): Blocklist {
  if (blocklistCache) return blocklistCache;
  const appRoot = process.env.APP_ROOT ?? process.cwd();
  const raw = readFileSync(path.join(appRoot, "blocklist.json"), "utf-8");
  blocklistCache = JSON.parse(raw) as Blocklist;
  return blocklistCache;
}

function matchKeyword(title: string): string | null {
  const blocklist = loadBlocklist();
  const lower = title.toLowerCase();
  for (const keyword of blocklist.keywords) {
    if (lower.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }
  return null;
}

interface ActiveWindowResult {
  title: string;
  owner: { name: string; processId: number };
}

const APP_TITLE_PATTERNS = [
  "ally desktop",
  "ally orb",
  "ally lock",
];

function isOwnWindow(result: ActiveWindowResult): boolean {
  if (result.owner.processId === process.pid) return true;
  const title = result.title.toLowerCase();
  return APP_TITLE_PATTERNS.some((p) => title.includes(p));
}

async function getActiveWindow(): Promise<ActiveWindowResult | undefined> {
  const mock = process.env.DEV_MOCK_ACTIVE_WIN;
  if (mock !== undefined && mock !== "") {
    return {
      title: mock,
      owner: { name: "dev-mock", processId: -1 },
    };
  }

  try {
    const mod = (await import("active-win")) as unknown as {
      activeWindow: () => Promise<ActiveWindowResult | undefined>;
    };
    return await mod.activeWindow();
  } catch (err) {
    if (!getActiveWindow.warnedOnce) {
      console.warn("[poller] active-win unavailable:", (err as Error).message);
      getActiveWindow.warnedOnce = true;
    }
    return undefined;
  }
}
getActiveWindow.warnedOnce = false;

export interface PollerHandlers {
  onLockTrigger: (info: { keyword: string; title: string }) => void;
  onBreakEnd: () => void;
  onStateTick: () => void;
}

let pollTimer: NodeJS.Timeout | null = null;
let tickTimer: NodeJS.Timeout | null = null;

export function startPoller(handlers: PollerHandlers) {
  if (pollTimer === null) {
    pollTimer = setInterval(() => void pollOnce(handlers), POLL_MS);
  }
  if (tickTimer === null) {
    tickTimer = setInterval(() => tickOnce(handlers), BREAK_TICK_MS);
  }
}

export function stopPoller() {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (tickTimer !== null) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

function tickOnce(handlers: PollerHandlers) {
  if (isBreakExpired()) {
    endBreak();
    handlers.onBreakEnd();
  } else if (isSessionActive() || isBreakActive()) {
    handlers.onStateTick();
  }
}

let lastLoggedTitle: string | null = null;

async function pollOnce(handlers: PollerHandlers) {
  if (!isSessionActive()) return;
  if (isBreakActive()) return;
  if (currentLockKeyword() !== null) return;

  const win = await getActiveWindow();
  if (!win) {
    if (lastLoggedTitle !== "<none>") {
      console.log("[poller] active-win returned nothing (WSL can't see Windows host apps; use DEV_MOCK_ACTIVE_WIN)");
      lastLoggedTitle = "<none>";
    }
    return;
  }

  if (win.title !== lastLoggedTitle) {
    console.log(`[poller] active window: "${win.title}" (owner: ${win.owner.name})`);
    lastLoggedTitle = win.title;
  }

  if (isOwnWindow(win)) return;

  const keyword = matchKeyword(win.title);
  if (keyword === null) return;
  if (isInGrace(keyword)) {
    console.log(`[poller] matched "${keyword}" but in grace period`);
    return;
  }

  console.log(`[poller] LOCK trigger: keyword="${keyword}" title="${win.title}"`);
  pauseForNegotiation(keyword);
  handlers.onLockTrigger({ keyword, title: win.title });
}
