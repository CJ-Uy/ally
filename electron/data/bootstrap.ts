import { db } from "../db";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS user_profile (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     study_hours_per_week INTEGER NOT NULL,
     education_level TEXT NOT NULL,
     onboarded_at INTEGER NOT NULL,
     notify_at_risk INTEGER NOT NULL DEFAULT 1,
     notify_due_today INTEGER NOT NULL DEFAULT 1,
     notify_streak_danger INTEGER NOT NULL DEFAULT 1,
     notify_chat_response INTEGER NOT NULL DEFAULT 0
   )`,
  `CREATE TABLE IF NOT EXISTS subjects (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     education_level TEXT NOT NULL,
     color TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     familiarity TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS syllabi (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
     file_name TEXT,
     parsed_at INTEGER NOT NULL,
     grading_breakdown TEXT,
     difficulty TEXT,
     topics TEXT,
     raw_summary TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS tasks (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     description TEXT,
     due_date INTEGER,
     scheduled_start INTEGER,
     scheduled_end INTEGER,
     estimated_minutes INTEGER,
     status TEXT NOT NULL DEFAULT 'todo',
     parent_task_id INTEGER,
     created_by TEXT NOT NULL DEFAULT 'user',
     created_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS events (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     type TEXT NOT NULL,
     starts_at INTEGER NOT NULL,
     ends_at INTEGER,
     created_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS daily_activity (
     date TEXT PRIMARY KEY,
     sessions_completed INTEGER NOT NULL DEFAULT 0,
     breaks_used INTEGER NOT NULL DEFAULT 0
   )`,
];

// Idempotent column additions for installs that pre-date the Scope 5 schema.
// SQLite has no ADD COLUMN IF NOT EXISTS, so we just swallow "duplicate column" errors.
const ALTERS = [
  "ALTER TABLE user_profile ADD COLUMN notify_at_risk INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE user_profile ADD COLUMN notify_due_today INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE user_profile ADD COLUMN notify_streak_danger INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE user_profile ADD COLUMN notify_chat_response INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE subjects ADD COLUMN familiarity TEXT",
  "ALTER TABLE tasks ADD COLUMN scheduled_start INTEGER",
  "ALTER TABLE tasks ADD COLUMN scheduled_end INTEGER",
];

let bootstrapped = false;

export async function bootstrapSchema(): Promise<void> {
  if (bootstrapped) return;
  console.log("[bootstrap] creating tables if missing…");
  for (const sql of STATEMENTS) {
    try {
      await db.$client.execute(sql);
    } catch (err) {
      console.error("[bootstrap] failed on:", sql.split("\n")[0]);
      throw err;
    }
  }

  for (const sql of ALTERS) {
    try {
      await db.$client.execute(sql);
      console.log(`[bootstrap] applied: ${sql}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/duplicate column|already exists/i.test(msg)) {
        console.warn(`[bootstrap] alter skipped (${msg.slice(0, 80)})`);
      }
    }
  }

  // Quick sanity check.
  const result = await db.$client.execute(
    "select name from sqlite_master where type='table' and name in ('user_profile','subjects','syllabi','tasks','events','daily_activity')",
  );
  console.log(
    `[bootstrap] tables present: ${result.rows.map((r) => r.name).join(", ")}`,
  );

  bootstrapped = true;
}
