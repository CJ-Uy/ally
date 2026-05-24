// Polls the `negotiations` Turso table for pending mobile-blocker requests,
// runs them through the same break-negotiation agent the desktop uses, and
// writes the reply (and any granted minutes) back to the row.

import { db } from "../db";
import { sendToAgent } from "../agent/gemini";
import type { ChatMessage } from "../session";

const POLL_MS = 3000;

interface NegotiationRow {
  id: number;
  blocked_app: string;
  user_message: string;
  conversation: string | null;
  status: string;
}

let timer: NodeJS.Timeout | null = null;
let running = false;

export function startNegotiationsPoller(): void {
  if (timer !== null) return;
  timer = setInterval(() => {
    if (running) return;
    running = true;
    void pollOnce().finally(() => { running = false; });
  }, POLL_MS);
  console.log("[negotiations] poller started");
}

export function stopNegotiationsPoller(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

async function pollOnce(): Promise<void> {
  let rows: NegotiationRow[] = [];
  try {
    const result = await db.$client.execute({
      sql: `select id, blocked_app, user_message, conversation, status
            from negotiations
            where status = 'pending'
            order by id asc
            limit 5`,
      args: [],
    });
    rows = result.rows as unknown as NegotiationRow[];
  } catch (err) {
    console.warn("[negotiations] query failed:", err);
    return;
  }

  for (const row of rows) {
    await handle(row);
  }
}

async function handle(row: NegotiationRow): Promise<void> {
  let history: ChatMessage[] = [];
  if (row.conversation) {
    try {
      const parsed = JSON.parse(row.conversation) as unknown;
      if (Array.isArray(parsed)) {
        history = parsed.filter(
          (m): m is ChatMessage =>
            typeof m === "object" &&
            m !== null &&
            (m as ChatMessage).role !== undefined &&
            typeof (m as ChatMessage).text === "string",
        );
      }
    } catch {
      history = [];
    }
  }

  // The first turn comes without context about what's blocked — prepend it
  // so the agent knows the user is asking to use a specific blocked app.
  const isFirstTurn = history.length === 0;
  const message = isFirstTurn
    ? `[Mobile session — blocked app: ${row.blocked_app}]\n\n${row.user_message}`
    : row.user_message;

  let reply;
  try {
    reply = await sendToAgent(history, message);
  } catch (err) {
    console.error("[negotiations] agent error on row", row.id, err);
    await markFailed(row.id, "Agent unavailable, try again.");
    return;
  }

  const nextHistory: ChatMessage[] = [
    ...history,
    { role: "user", text: message },
    { role: "model", text: reply.visibleText },
  ];

  if (reply.decision?.granted && reply.decision.minutes !== undefined) {
    await db.$client.execute({
      sql: `update negotiations
            set status='granted',
                ai_reply=?,
                minutes_granted=?,
                conversation=?,
                responded_at=?
            where id=?`,
      args: [
        reply.visibleText,
        reply.decision.minutes,
        JSON.stringify(nextHistory),
        Date.now(),
        row.id,
      ],
    });
    console.log(`[negotiations] granted ${reply.decision.minutes}m for row ${row.id}`);
    return;
  }

  if (reply.decision && reply.decision.granted === false) {
    await db.$client.execute({
      sql: `update negotiations
            set status='denied',
                ai_reply=?,
                conversation=?,
                responded_at=?
            where id=?`,
      args: [reply.visibleText, JSON.stringify(nextHistory), Date.now(), row.id],
    });
    console.log(`[negotiations] denied row ${row.id}`);
    return;
  }

  // No decision yet — agent is still negotiating
  await db.$client.execute({
    sql: `update negotiations
          set status='awaiting_user',
              ai_reply=?,
              conversation=?,
              responded_at=?
          where id=?`,
    args: [reply.visibleText, JSON.stringify(nextHistory), Date.now(), row.id],
  });
  console.log(`[negotiations] awaiting user reply on row ${row.id}`);
}

async function markFailed(id: number, msg: string): Promise<void> {
  try {
    await db.$client.execute({
      sql: `update negotiations set status='awaiting_user', ai_reply=?, responded_at=? where id=?`,
      args: [msg, Date.now(), id],
    });
  } catch {
    // Best effort: preserve the original poller error if this status update fails.
  }
}
