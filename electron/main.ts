import "dotenv/config";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { db } from "./db";
import { r2 } from "./r2";
import {
  appendModelMessage,
  appendUserMessage,
  currentLockKeyword,
  getHistory,
  grantBreak,
  isSessionActive,
  resumeFromNegotiation,
  setGrace,
  setSessionSubject,
  snapshot,
  startSession,
  stopSession,
} from "./session";
import { sendToAgent } from "./agent/gemini";
import { getAiStatus } from "./agent/llm";
import { createLockWindow, createOrbWindow } from "./windows";
import { startPoller, stopPoller } from "./poller";
import { registerProductivityIpc } from "./ipc/productivity";
import { upsertSessionSync } from "./data/session-sync";
import { bootstrapSchema } from "./data/bootstrap";
import { recordBreakUsed, recordCompletedSession } from "./data/activity";
import {
  runAppOpenChecks,
  scheduleDailyChecks,
} from "./notifications";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: Electron.BrowserWindow | null;
let orbWin: Electron.BrowserWindow | null = null;
let lockWin: Electron.BrowserWindow | null = null;
const GRACE_MS = 5000;

function isAllowedNavigation(url: string) {
  try {
    if (VITE_DEV_SERVER_URL) {
      return new URL(url).origin === new URL(VITE_DEV_SERVER_URL).origin;
    }

    if (new URL(url).protocol !== "file:") {
      return false;
    }

    const relativePath = path.relative(RENDERER_DIST, fileURLToPath(url));
    return (
      relativePath === "" ||
      (relativePath !== ".." &&
        !relativePath.startsWith(`..${path.sep}`) &&
        !path.isAbsolute(relativePath))
    );
  } catch {
    return false;
  }
}

function isSafeExternalUrl(url: string) {
  try {
    const protocol = new URL(url).protocol;
    return protocol === "https:" || protocol === "mailto:";
  } catch {
    return false;
  }
}

function toOptionalPrefix(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error("R2 prefix must be a string");
  }

  if (value.length > 512) {
    throw new Error("R2 prefix is too long");
  }

  return value;
}

function createWindow() {
  win = new BrowserWindow({
    title: "Ally Desktop",
    width: 1120,
    height: 760,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: "#f5f7fb",
    show: false,
    icon: path.join(process.env.VITE_PUBLIC, "ally.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url);
    }

    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault();

      if (isSafeExternalUrl(url)) {
        void shell.openExternal(url);
      }
    }
  });

  win.once("ready-to-show", () => {
    win?.maximize();
    win?.show();
    win?.focus();
  });

  win.on("closed", () => {
    win = null;
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    bootstrap();
  }
});

function broadcastState() {
  const snap = snapshot();
  for (const w of [win, orbWin, lockWin]) {
    if (w && !w.isDestroyed()) {
      w.webContents.send("state:update", snap);
    }
  }
}

function closeLockWindow() {
  if (lockWin && !lockWin.isDestroyed()) {
    lockWin.destroy();
  }
  lockWin = null;
}

function openLockWindow(info: { keyword: string; title: string }) {
  if (lockWin && !lockWin.isDestroyed()) return;
  lockWin = createLockWindow();
  lockWin.on("closed", () => {
    lockWin = null;
  });
  lockWin.webContents.once("did-finish-load", () => {
    lockWin?.webContents.send("lock:open", info);
  });
}

function bootstrap() {
  createWindow();
  orbWin = createOrbWindow();
  orbWin.on("closed", () => {
    orbWin = null;
  });

  void bootstrapSchema()
    .then(() => {
      void runAppOpenChecks().catch((err) => {
        console.warn("[notifications] app-open checks failed:", err);
      });
      scheduleDailyChecks();
    })
    .catch((err) => {
      console.error("[bootstrap] schema init failed:", err);
    });

  startPoller({
    onLockTrigger: (info) => {
      openLockWindow(info);
      broadcastState();
    },
    onBreakEnd: () => {
      broadcastState();
    },
    onStateTick: () => {
      broadcastState();
    },
  });
}

app.whenReady().then(() => {
  registerProductivityIpc();
  bootstrap();
});

app.on("before-quit", () => {
  stopPoller();
});

ipcMain.handle("app:ping", async () => "pong");

ipcMain.handle("orb:askAi", async () => {
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore();
    win.focus();
    win.webContents.send("chat:open");
  }
});

ipcMain.handle("orb:setVisible", async (_event, payload: unknown) => {
  if (!orbWin || orbWin.isDestroyed()) return;
  const visible = typeof payload === "object" && payload !== null && "visible" in payload
    ? Boolean((payload as { visible: unknown }).visible)
    : true;
  if (visible) {
    if (!orbWin.isVisible()) orbWin.showInactive();
  } else {
    if (orbWin.isVisible()) orbWin.hide();
  }
});

ipcMain.handle("session:start", async (_event, payload?: unknown) => {
  if (!isSessionActive()) {
    const subject =
      typeof payload === "object" && payload !== null && "subject" in payload
        ? String((payload as { subject: unknown }).subject ?? "")
        : "";
    startSession(subject);
    void upsertSessionSync(true, subject || null, Date.now());
    broadcastState();
  }
});

ipcMain.handle("session:stop", async () => {
  if (isSessionActive()) {
    stopSession();
    closeLockWindow();
    void upsertSessionSync(false, null, null);
    try {
      await recordCompletedSession();
    } catch (err) {
      console.warn("[session] failed to record completed session:", err);
    }
    broadcastState();
  }
});

ipcMain.handle("session:setSubject", async (_event, payload: unknown) => {
  const subject =
    typeof payload === "object" && payload !== null && "subject" in payload
      ? String((payload as { subject: unknown }).subject ?? "")
      : "";
  setSessionSubject(subject);
  broadcastState();
  return { ok: true };
});

ipcMain.handle("session:getState", async () => snapshot());

ipcMain.handle("lock:close", async () => {
  const keyword = currentLockKeyword();
  if (keyword) {
    setGrace(keyword, GRACE_MS);
  }
  resumeFromNegotiation();
  closeLockWindow();
  broadcastState();
});

ipcMain.handle(
  "chat:send",
  async (_event: Electron.IpcMainInvokeEvent, payload: unknown) => {
    const text =
      typeof payload === "object" && payload !== null && "text" in payload
        ? String((payload as { text: unknown }).text ?? "")
        : "";
    if (text.trim().length === 0) {
      return { visibleText: "" };
    }

    const history = getHistory();
    appendUserMessage(text);
    const reply = await sendToAgent(history, text);
    appendModelMessage(reply.visibleText);

    if (reply.decision?.granted && reply.decision.minutes !== undefined) {
      const keyword = currentLockKeyword() ?? "unknown";
      grantBreak(keyword, reply.decision.minutes);
      closeLockWindow();
      try {
        await recordBreakUsed();
      } catch (err) {
        console.warn("[session] failed to record break used:", err);
      }
      broadcastState();
      return {
        visibleText: reply.visibleText,
        granted: true,
        minutes: reply.decision.minutes,
      };
    }

    if (reply.decision && reply.decision.granted === false) {
      return {
        visibleText: reply.visibleText,
        granted: false,
      };
    }

    return { visibleText: reply.visibleText };
  },
);

ipcMain.handle("db:health", async () => {
  await db.$client.execute("select 1");
  return { ok: true };
});

ipcMain.handle("ai:status", async () => getAiStatus());

ipcMain.handle("mobile:pairingCode", async () => {
  const url = process.env.TURSO_DATABASE_URL ?? "";
  const token = process.env.TURSO_AUTH_TOKEN ?? "";
  if (!url || !token) return null;
  return Buffer.from(`${url}\n${token}`).toString("base64");
});

ipcMain.handle(
  "r2:list",
  async (_event: Electron.IpcMainInvokeEvent, prefix?: unknown) => {
    const result = await r2.list({
      prefix: toOptionalPrefix(prefix),
      limit: 25,
    });

    return {
      ...result,
      objects: result.objects.map((object) => ({
        ...object,
        uploaded: object.uploaded?.toISOString(),
      })),
    };
  },
);
