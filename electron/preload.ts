import electron from "electron";

const { contextBridge, ipcRenderer } = electron as typeof import("electron");

interface SessionStateSnapshot {
  session: { active: boolean; elapsedMs: number; paused: boolean };
  break: { active: boolean; msRemaining: number; forKeyword?: string };
}

const api: Window["api"] = {
  ping: () => ipcRenderer.invoke("app:ping") as Promise<string>,
  dbHealth: () => ipcRenderer.invoke("db:health") as Promise<{ ok: boolean }>,
  r2List: (prefix?: string) =>
    ipcRenderer.invoke("r2:list", prefix) as Promise<{
      objects: Array<{
        key: string;
        size: number;
        etag?: string;
        uploaded?: string;
      }>;
      truncated: boolean;
      cursor?: string;
      delimitedPrefixes: string[];
    }>,
  sessionStart: () => ipcRenderer.invoke("session:start") as Promise<void>,
  sessionStop: () => ipcRenderer.invoke("session:stop") as Promise<void>,
  sessionGetState: () =>
    ipcRenderer.invoke("session:getState") as Promise<SessionStateSnapshot>,
  chatSend: (text: string) =>
    ipcRenderer.invoke("chat:send", { text }) as Promise<{
      visibleText: string;
      granted?: boolean;
      minutes?: number;
    }>,
  lockClose: () => ipcRenderer.invoke("lock:close") as Promise<void>,
  onStateUpdate: (cb: (snap: SessionStateSnapshot) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      snap: SessionStateSnapshot,
    ) => cb(snap);
    ipcRenderer.on("state:update", listener);
    return () => ipcRenderer.removeListener("state:update", listener);
  },
  onLockOpen: (cb: (info: { keyword: string; title: string }) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      info: { keyword: string; title: string },
    ) => cb(info);
    ipcRenderer.on("lock:open", listener);
    return () => ipcRenderer.removeListener("lock:open", listener);
  },
};

contextBridge.exposeInMainWorld("api", api);
