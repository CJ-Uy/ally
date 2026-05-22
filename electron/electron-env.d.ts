/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string;
    /** /dist/ or /public/ */
    VITE_PUBLIC: string;
  }
}

interface SessionStateSnapshot {
  session: { active: boolean; elapsedMs: number; paused: boolean };
  break: { active: boolean; msRemaining: number; forKeyword?: string };
}

interface ChatSendResult {
  visibleText: string;
  granted?: boolean;
  minutes?: number;
}

interface LockOpenInfo {
  keyword: string;
  title: string;
}

type Unsubscribe = () => void;

// Used in Renderer process, expose in `preload.ts`
interface Window {
  api: {
    ping: () => Promise<string>;
    dbHealth: () => Promise<{ ok: boolean }>;
    r2List: (prefix?: string) => Promise<{
      objects: Array<{
        key: string;
        size: number;
        etag?: string;
        uploaded?: string;
      }>;
      truncated: boolean;
      cursor?: string;
      delimitedPrefixes: string[];
    }>;
    sessionStart: () => Promise<void>;
    sessionStop: () => Promise<void>;
    sessionGetState: () => Promise<SessionStateSnapshot>;
    chatSend: (text: string) => Promise<ChatSendResult>;
    lockClose: () => Promise<void>;
    onStateUpdate: (cb: (snap: SessionStateSnapshot) => void) => Unsubscribe;
    onLockOpen: (cb: (info: LockOpenInfo) => void) => Unsubscribe;
  };
}
