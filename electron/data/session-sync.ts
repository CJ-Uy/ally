import { db } from "../db";

export async function upsertSessionSync(
  active: boolean,
  subject: string | null,
  startedAt: number | null,
): Promise<void> {
  try {
    await db.$client.execute({
      sql: `INSERT OR REPLACE INTO session_sync (id, active, subject, started_at, updated_at) VALUES (1, ?, ?, ?, ?)`,
      args: [active ? 1 : 0, subject, startedAt, Date.now()],
    });
  } catch (err) {
    console.warn("[session-sync] upsert failed:", err);
  }
}
