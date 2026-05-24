import { col, query, type TursoResult, type TursoRow } from "./turso";
import type { PairingData } from "./storage";

export type NegotiationStatus =
  | "pending"
  | "awaiting_user"
  | "granted"
  | "denied";

export interface NegotiationRecord {
  id: number;
  blockedApp: string;
  conversation: Array<{ role: "user" | "model"; text: string }>;
  status: NegotiationStatus;
  aiReply: string | null;
  minutesGranted: number | null;
  requestedAt: number;
  respondedAt: number | null;
}

function parseConversation(raw: string | null): NegotiationRecord["conversation"] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is NegotiationRecord["conversation"][number] =>
        typeof m === "object" &&
        m !== null &&
        (m.role === "user" || m.role === "model") &&
        typeof m.text === "string",
    );
  } catch {
    return [];
  }
}

function rowToRecord(result: TursoResult, row: TursoRow): NegotiationRecord {
  return {
    id: Number(col(result, row, "id")),
    blockedApp: col(result, row, "blocked_app") ?? "",
    conversation: parseConversation(col(result, row, "conversation")),
    status: (col(result, row, "status") ?? "pending") as NegotiationStatus,
    aiReply: col(result, row, "ai_reply"),
    minutesGranted: col(result, row, "minutes_granted")
      ? Number(col(result, row, "minutes_granted"))
      : null,
    requestedAt: Number(col(result, row, "requested_at") ?? 0),
    respondedAt: col(result, row, "responded_at")
      ? Number(col(result, row, "responded_at"))
      : null,
  };
}

export async function createNegotiation(
  pairing: PairingData,
  blockedApp: string,
  userMessage: string,
): Promise<number> {
  const now = Date.now();
  const result = await query(
    pairing,
    `INSERT INTO negotiations (source, blocked_app, user_message, status, requested_at)
     VALUES ('mobile', ?, ?, 'pending', ?)
     RETURNING id`,
    [
      { type: "text", value: blockedApp },
      { type: "text", value: userMessage },
      { type: "integer", value: String(now) },
    ],
  );
  const row = result.rows[0];
  return Number(col(result, row, "id"));
}

export async function fetchNegotiation(
  pairing: PairingData,
  id: number,
): Promise<NegotiationRecord | null> {
  const result = await query(
    pairing,
    `SELECT id, blocked_app, conversation, status, ai_reply, minutes_granted,
            requested_at, responded_at
     FROM negotiations WHERE id = ?`,
    [{ type: "integer", value: String(id) }],
  );
  if (result.rows.length === 0) return null;
  return rowToRecord(result, result.rows[0]);
}

export async function continueNegotiation(
  pairing: PairingData,
  id: number,
  userMessage: string,
): Promise<void> {
  // Marks the row pending again so the desktop poller picks it up with the new user turn.
  await query(
    pairing,
    `UPDATE negotiations
     SET status='pending',
         user_message=?,
         requested_at=?
     WHERE id=? AND status='awaiting_user'`,
    [
      { type: "text", value: userMessage },
      { type: "integer", value: String(Date.now()) },
      { type: "integer", value: String(id) },
    ],
  );
}
