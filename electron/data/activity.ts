import { desc, eq, gte } from "drizzle-orm";
import { db } from "../db";
import { dailyActivity } from "../../src/lib/schema";

export interface DailyActivity {
  date: string;
  sessionsCompleted: number;
  breaksUsed: number;
}

function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function ensureRow(date: string): Promise<DailyActivity> {
  const rows = await db
    .select()
    .from(dailyActivity)
    .where(eq(dailyActivity.date, date))
    .limit(1);
  if (rows[0]) return rows[0] as DailyActivity;
  const [inserted] = await db
    .insert(dailyActivity)
    .values({ date, sessionsCompleted: 0, breaksUsed: 0 })
    .returning();
  return inserted as DailyActivity;
}

export async function getTodayActivity(): Promise<DailyActivity> {
  return ensureRow(localDateKey());
}

export async function recordCompletedSession(): Promise<DailyActivity> {
  const date = localDateKey();
  const row = await ensureRow(date);
  const next = row.sessionsCompleted + 1;
  await db
    .update(dailyActivity)
    .set({ sessionsCompleted: next })
    .where(eq(dailyActivity.date, date));
  return { ...row, sessionsCompleted: next };
}

export async function recordBreakUsed(): Promise<DailyActivity> {
  const date = localDateKey();
  const row = await ensureRow(date);
  const next = row.breaksUsed + 1;
  await db
    .update(dailyActivity)
    .set({ breaksUsed: next })
    .where(eq(dailyActivity.date, date));
  return { ...row, breaksUsed: next };
}

// Streak = consecutive days back from today where sessions_completed > 0.
// If today has no session yet, we still count the streak from yesterday so
// "you have a 4-day streak" survives until midnight even before you study.
export async function currentStreakDays(): Promise<number> {
  const lookbackDays = 60;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);
  const rows = (await db
    .select()
    .from(dailyActivity)
    .where(gte(dailyActivity.date, localDateKey(cutoff)))
    .orderBy(desc(dailyActivity.date))) as DailyActivity[];

  const byDate = new Map(rows.map((r) => [r.date, r.sessionsCompleted]));

  let streak = 0;
  const cursor = new Date();
  const todayKey = localDateKey(cursor);
  const todayCount = byDate.get(todayKey) ?? 0;

  if (todayCount === 0) {
    cursor.setDate(cursor.getDate() - 1);
  }

  for (let i = 0; i < lookbackDays; i++) {
    const key = localDateKey(cursor);
    if ((byDate.get(key) ?? 0) > 0) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
