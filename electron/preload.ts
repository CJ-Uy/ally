import electron from "electron";
const { ipcRenderer, contextBridge } = electron as typeof import("electron");

contextBridge.exposeInMainWorld("api", {
  ping: () => ipcRenderer.invoke("app:ping") as Promise<string>,
  dbHealth: () => ipcRenderer.invoke("db:health") as Promise<{ ok: boolean }>,
  r2List: (prefix?: string) =>
    ipcRenderer.invoke("r2:list", prefix) as Promise<{
      objects: Array<{ key: string; size: number; etag?: string }>;
      truncated: boolean;
      cursor?: string;
      delimitedPrefixes: string[];
    }>,
});
