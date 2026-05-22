import { createClient } from "@libsql/client";
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

function createTursoClient(): DbClient {
  const config = getTursoConfig();
  const client = createClient({
    url: config.url,
    authToken: config.authToken,
  });

  return drizzle(client, { schema });
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
