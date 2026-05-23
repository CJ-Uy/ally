import { BrowserWindow, screen, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

function rendererPath(filename: string): { kind: "url" | "file"; value: string } {
  if (VITE_DEV_SERVER_URL) {
    const base = VITE_DEV_SERVER_URL.endsWith("/")
      ? VITE_DEV_SERVER_URL.slice(0, -1)
      : VITE_DEV_SERVER_URL;
    return { kind: "url", value: `${base}/${filename}` };
  }
  const rendererDist = path.join(process.env.APP_ROOT ?? "", "dist");
  return { kind: "file", value: path.join(rendererDist, filename) };
}

function loadInto(win: Electron.BrowserWindow, filename: string) {
  const target = rendererPath(filename);
  if (target.kind === "url") {
    void win.loadURL(target.value);
  } else {
    void win.loadFile(target.value);
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

function applyNavigationGuards(win: Electron.BrowserWindow) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    const allowedOrigin = VITE_DEV_SERVER_URL
      ? new URL(VITE_DEV_SERVER_URL).origin
      : null;
    try {
      if (allowedOrigin && new URL(url).origin === allowedOrigin) return;
    } catch {
      // fallthrough to block
    }
    event.preventDefault();
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url);
    }
  });
}

const ORB_WIDTH = 220;
const ORB_HEIGHT = 240;
const ORB_MARGIN = 16;

export function createOrbWindow(): Electron.BrowserWindow {
  const primary = screen.getPrimaryDisplay();
  const { workArea } = primary;

  const win = new BrowserWindow({
    title: "Ally Orb",
    width: ORB_WIDTH,
    height: ORB_HEIGHT,
    x: workArea.x + workArea.width - ORB_WIDTH - ORB_MARGIN,
    y: workArea.y + workArea.height - ORB_HEIGHT - ORB_MARGIN,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  applyNavigationGuards(win);
  loadInto(win, "orb.html");

  return win;
}

export function createLockWindow(): Electron.BrowserWindow {
  const primary = screen.getPrimaryDisplay();
  const { bounds } = primary;

  const win = new BrowserWindow({
    title: "Ally Lock",
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    fullscreen: true,
    kiosk: true,
    backgroundColor: "#1f2937",
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  applyNavigationGuards(win);
  loadInto(win, "lock.html");

  win.once("ready-to-show", () => {
    win.show();
    win.setFullScreen(true);
    win.setBounds(bounds);
    win.moveTop();
    win.focus();
    // Mimic what alt-tab does: toggle always-on-top + re-focus to force
    // Windows to re-layer above other fullscreen apps (e.g. Chrome on YouTube).
    setTimeout(() => {
      if (win.isDestroyed()) return;
      win.setAlwaysOnTop(false);
      win.setAlwaysOnTop(true, "screen-saver");
      win.setBounds(bounds);
      win.moveTop();
      win.focus();
    }, 120);
  });

  return win;
}
