import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const userProfile = sqliteTable("user_profile", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studyHoursPerWeek: integer("study_hours_per_week").notNull(),
  educationLevel: text("education_level").notNull(),
  onboardedAt: integer("onboarded_at", { mode: "timestamp_ms" }).notNull(),
  notifyAtRisk: integer("notify_at_risk", { mode: "boolean" })
    .notNull()
    .default(true),
  notifyDueToday: integer("notify_due_today", { mode: "boolean" })
    .notNull()
    .default(true),
  notifyStreakDanger: integer("notify_streak_danger", { mode: "boolean" })
    .notNull()
    .default(true),
  notifyChatResponse: integer("notify_chat_response", { mode: "boolean" })
    .notNull()
    .default(false),
});

export const subjects = sqliteTable("subjects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  educationLevel: text("education_level").notNull(),
  color: text("color").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  familiarity: text("familiarity"),
});

export const dailyActivity = sqliteTable("daily_activity", {
  date: text("date").primaryKey(),
  sessionsCompleted: integer("sessions_completed").notNull().default(0),
  breaksUsed: integer("breaks_used").notNull().default(0),
});

export const syllabi = sqliteTable("syllabi", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  fileName: text("file_name"),
  parsedAt: integer("parsed_at", { mode: "timestamp_ms" }).notNull(),
  gradingBreakdown: text("grading_breakdown"),
  difficulty: text("difficulty"),
  topics: text("topics"),
  rawSummary: text("raw_summary"),
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: integer("due_date", { mode: "timestamp_ms" }),
  scheduledStart: integer("scheduled_start", { mode: "timestamp_ms" }),
  scheduledEnd: integer("scheduled_end", { mode: "timestamp_ms" }),
  estimatedMinutes: integer("estimated_minutes"),
  status: text("status").notNull().default("todo"),
  parentTaskId: integer("parent_task_id"),
  createdBy: text("created_by").notNull().default("user"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const sessionSync = sqliteTable("session_sync", {
  id: integer("id").primaryKey(),
  active: integer("active", { mode: "boolean" }).notNull().default(false),
  subject: text("subject"),
  startedAt: integer("started_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const negotiations = sqliteTable("negotiations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull().default("mobile"),
  blockedApp: text("blocked_app").notNull(),
  userMessage: text("user_message").notNull(),
  conversation: text("conversation"),
  status: text("status").notNull().default("pending"),
  minutesGranted: integer("minutes_granted"),
  aiReply: text("ai_reply"),
  requestedAt: integer("requested_at", { mode: "timestamp_ms" }).notNull(),
  respondedAt: integer("responded_at", { mode: "timestamp_ms" }),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull(),
  startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
  endsAt: integer("ends_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
