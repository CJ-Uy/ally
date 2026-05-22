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

// Used in Renderer process, expose in `preload.ts`
interface Window {
  api: {
    ping: () => Promise<string>;
    dbHealth: () => Promise<{ ok: boolean }>;
    r2List: (prefix?: string) => Promise<{
      objects: Array<{ key: string; size: number; etag?: string }>;
      truncated: boolean;
      cursor?: string;
      delimitedPrefixes: string[];
    }>;
  };
}
