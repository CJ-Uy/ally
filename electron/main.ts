import "dotenv/config";
import electron from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { db } from "./db";
import { r2 } from "./r2";

const { app, BrowserWindow, ipcMain, shell } =
  electron as typeof import("electron");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
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
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
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
    createWindow();
  }
});

app.whenReady().then(createWindow);

ipcMain.handle("app:ping", async () => "pong");

ipcMain.handle("db:health", async () => {
  await db.$client.execute("select 1");
  return { ok: true };
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
