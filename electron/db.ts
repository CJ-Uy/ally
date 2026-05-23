import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../src/lib/schema";

type DbClient = ReturnType<typeof drizzle<typeof schema>>;

type TursoConfig = {
  url: string;
  authToken: string;
};

function getTursoConfig(): TursoConfig {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error(
      "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN env vars must be set",
    );
  }

  return { url, authToken };
}

function isTransientError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string; cause?: unknown };
  const code = e.code ?? "";
  const msg = e.message ?? "";
  if (
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN"
  ) {
    return true;
  }
  if (
    msg.includes("ConnectTimeoutError") ||
    msg.includes("fetch failed") ||
    msg.includes("network timeout")
  ) {
    return true;
  }
  if (e.cause) return isTransientError(e.cause);
  return false;
}

function wrapClientWithRetry(raw: Client): Client {
  const MAX_ATTEMPTS = 3;
  const BASE_DELAY_MS = 500;

  const retried = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (attempt === MAX_ATTEMPTS || !isTransientError(err)) throw err;
        const delay = BASE_DELAY_MS * attempt;
        console.warn(
          `[db] ${label} attempt ${attempt}/${MAX_ATTEMPTS} failed transiently, retrying in ${delay}ms`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastErr;
  };

  return new Proxy(raw, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop === "execute" && typeof value === "function") {
        return (...args: Parameters<Client["execute"]>) =>
          retried("execute", () => value.apply(target, args));
      }
      if (prop === "batch" && typeof value === "function") {
        return (...args: Parameters<Client["batch"]>) =>
          retried("batch", () => value.apply(target, args));
      }
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as Client;
}

function createTursoClient(): DbClient {
  const config = getTursoConfig();
  const rawClient = createClient({
    url: config.url,
    authToken: config.authToken,
  });

  return drizzle(wrapClientWithRetry(rawClient), { schema });
}

const globalForDb = globalThis as unknown as { db: DbClient | undefined };

export const db = new Proxy({} as DbClient, {
  get(_target, prop) {
    if (!globalForDb.db) {
      globalForDb.db = createTursoClient();
    }

    return (globalForDb.db as unknown as Record<string | symbol, unknown>)[
      prop
    ];
  },
});
