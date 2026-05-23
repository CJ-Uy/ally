import { db } from "../db";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS user_profile (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     study_hours_per_week INTEGER NOT NULL,
     education_level TEXT NOT NULL,
     onboarded_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS subjects (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     education_level TEXT NOT NULL,
     color TEXT NOT NULL,
     created_at INTEGER NOT NULL
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
];

let bootstrapped = false;

export async function bootstrapSchema(): Promise<void> {
  if (bootstrapped) return;
  for (const sql of STATEMENTS) {
    await db.$client.execute(sql);
  }
  bootstrapped = true;
}
