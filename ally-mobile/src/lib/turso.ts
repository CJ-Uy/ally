import { toHttpUrl } from "./pairing";
import { PairingData } from "./storage";

export interface TursoValue {
  type: string;
  value: string | null;
}

export interface TursoRow {
  [index: number]: TursoValue;
}

export interface TursoResult {
  cols: Array<{ name: string }>;
  rows: TursoRow[];
}

export async function query(
  pairing: PairingData,
  sql: string,
  args: TursoValue[] = [],
): Promise<TursoResult> {
  const url = `${toHttpUrl(pairing.dbUrl)}/v2/pipeline`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pairing.authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args } },
        { type: "close" },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Turso HTTP ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as {
    results: Array<{
      type: string;
      response?: { type: string; result: TursoResult };
      error?: { message: string };
    }>;
  };

  const first = json.results[0];
  if (first?.type === "error") {
    throw new Error(first.error?.message ?? "Turso query error");
  }
  if (first?.response?.result == null) {
    throw new Error("Unexpected Turso response shape");
  }
  return first.response.result;
}

export function col(result: TursoResult, row: TursoRow, name: string): string | null {
  const idx = result.cols.findIndex((c) => c.name === name);
  if (idx === -1) return null;
  return row[idx]?.value ?? null;
}

// ─── Public types ────────────────────────────────────────────────────────────

export interface SessionSync {
  active: boolean;
  subject: string | null;
  startedAt: number | null;
  updatedAt: number;
}

export interface StudyBlock {
  id: number;
  title: string;
  startsAt: number;
  endsAt: number | null;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function fetchSessionSync(
  pairing: PairingData,
): Promise<SessionSync | null> {
  const result = await query(
    pairing,
    "SELECT active, subject, started_at, updated_at FROM session_sync WHERE id = 1",
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    active: col(result, row, "active") === "1",
    subject: col(result, row, "subject"),
    startedAt: col(result, row, "started_at")
      ? Number(col(result, row, "started_at"))
      : null,
    updatedAt: Number(col(result, row, "updated_at") ?? 0),
  };
}

export async function fetchUpcomingStudyBlocks(
  pairing: PairingData,
): Promise<StudyBlock[]> {
  const now = Date.now();
  // Fetch study_block events starting within the next 25 hours
  const cutoff = now + 25 * 60 * 60 * 1000;
  const result = await query(
    pairing,
    `SELECT id, title, starts_at, ends_at FROM events
     WHERE type = 'study_block' AND starts_at > ? AND starts_at < ?
     ORDER BY starts_at ASC LIMIT 20`,
    [
      { type: "integer", value: String(now) },
      { type: "integer", value: String(cutoff) },
    ],
  );
  return result.rows.map((row) => ({
    id: Number(col(result, row, "id")),
    title: col(result, row, "title") ?? "Study block",
    startsAt: Number(col(result, row, "starts_at")),
    endsAt: col(result, row, "ends_at")
      ? Number(col(result, row, "ends_at"))
      : null,
  }));
}

export async function startMobileSession(
  pairing: PairingData,
  subject: string | null,
): Promise<void> {
  const now = Date.now();
  await query(
    pairing,
    `INSERT OR REPLACE INTO session_sync (id, active, subject, started_at, updated_at)
     VALUES (1, 1, ?, ?, ?)`,
    [
      { type: subject ? "text" : "null", value: subject },
      { type: "integer", value: String(now) },
      { type: "integer", value: String(now) },
    ],
  );
}

export async function stopMobileSession(pairing: PairingData): Promise<void> {
  await query(
    pairing,
    `INSERT OR REPLACE INTO session_sync (id, active, subject, started_at, updated_at)
     VALUES (1, 0, NULL, NULL, ?)`,
    [{ type: "integer", value: String(Date.now()) }],
  );
}

export async function testConnection(pairing: PairingData): Promise<boolean> {
  try {
    await query(pairing, "SELECT 1");
    return true;
  } catch {
    return false;
  }
}
