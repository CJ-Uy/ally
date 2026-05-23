import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "../db";
import { tasks } from "../../src/lib/schema";

export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: number;
  subjectId: number;
  title: string;
  description: string | null;
  dueDate: Date | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  estimatedMinutes: number | null;
  status: TaskStatus;
  parentTaskId: number | null;
  createdBy: string;
  createdAt: Date;
}

export interface TaskInsert {
  subjectId: number;
  title: string;
  description?: string | null;
  dueDate?: Date | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  estimatedMinutes?: number | null;
  status?: TaskStatus;
  parentTaskId?: number | null;
  createdBy?: "user" | "ai";
}

export interface TaskPatch {
  title?: string;
  description?: string | null;
  dueDate?: Date | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  estimatedMinutes?: number | null;
  status?: TaskStatus;
  subjectId?: number;
}

export async function listTasks(): Promise<Task[]> {
  return (await db.select().from(tasks)) as Task[];
}

export async function listTasksForSubject(subjectId: number): Promise<Task[]> {
  return (await db
    .select()
    .from(tasks)
    .where(eq(tasks.subjectId, subjectId))) as Task[];
}

export async function listTodayTasks(): Promise<Task[]> {
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const rows = (await db
    .select()
    .from(tasks)
    .where(lt(tasks.dueDate, new Date(endOfDay.getTime() + 1)))) as Task[];
  return rows.filter((t) => t.status !== "done");
}

export async function listOverdueTasks(): Promise<Task[]> {
  const now = new Date();
  const rows = (await db
    .select()
    .from(tasks)
    .where(and(lt(tasks.dueDate, now)))) as Task[];
  return rows.filter((t) => t.status !== "done");
}

export async function listUpcomingTasks(daysAhead = 14): Promise<Task[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const rows = (await db
    .select()
    .from(tasks)
    .where(and(gte(tasks.dueDate, start), lt(tasks.dueDate, end)))) as Task[];
  return rows;
}

export async function createTask(input: TaskInsert): Promise<Task> {
  const [row] = await db
    .insert(tasks)
    .values({
      subjectId: input.subjectId,
      title: input.title,
      description: input.description ?? null,
      dueDate: input.dueDate ?? null,
      scheduledStart: input.scheduledStart ?? null,
      scheduledEnd: input.scheduledEnd ?? null,
      estimatedMinutes: input.estimatedMinutes ?? null,
      status: input.status ?? "todo",
      parentTaskId: input.parentTaskId ?? null,
      createdBy: input.createdBy ?? "user",
      createdAt: new Date(),
    })
    .returning();
  return row as Task;
}

export async function updateTask(id: number, patch: TaskPatch): Promise<Task | null> {
  if (Object.keys(patch).length === 0) {
    const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return (rows[0] as Task) ?? null;
  }
  await db.update(tasks).set(patch).where(eq(tasks.id, id));
  const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return (rows[0] as Task) ?? null;
}

export async function deleteTask(id: number): Promise<void> {
  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function getTask(id: number): Promise<Task | null> {
  const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return (rows[0] as Task) ?? null;
}
