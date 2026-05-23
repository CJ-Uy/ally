import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "../db";
import { events } from "../../src/lib/schema";

export type EventType = "exam" | "class" | "deadline" | "study_block";

export interface CalendarEvent {
  id: number;
  subjectId: number;
  title: string;
  type: EventType;
  startsAt: Date;
  endsAt: Date | null;
  createdAt: Date;
}

export interface EventInsert {
  subjectId: number;
  title: string;
  type: EventType;
  startsAt: Date;
  endsAt?: Date | null;
}

export interface EventPatch {
  title?: string;
  type?: EventType;
  startsAt?: Date;
  endsAt?: Date | null;
  subjectId?: number;
}

export async function listEvents(): Promise<CalendarEvent[]> {
  return (await db.select().from(events)) as CalendarEvent[];
}

export async function listUpcomingEvents(daysAhead = 7): Promise<CalendarEvent[]> {
  const now = new Date();
  const end = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  return (await db
    .select()
    .from(events)
    .where(and(gte(events.startsAt, now), lt(events.startsAt, end)))) as CalendarEvent[];
}

export async function createEvent(input: EventInsert): Promise<CalendarEvent> {
  const [row] = await db
    .insert(events)
    .values({
      subjectId: input.subjectId,
      title: input.title,
      type: input.type,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      createdAt: new Date(),
    })
    .returning();
  return row as CalendarEvent;
}

export async function updateEvent(
  id: number,
  patch: EventPatch,
): Promise<CalendarEvent | null> {
  if (Object.keys(patch).length === 0) {
    const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
    return (rows[0] as CalendarEvent) ?? null;
  }
  await db.update(events).set(patch).where(eq(events.id, id));
  const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return (rows[0] as CalendarEvent) ?? null;
}

export async function deleteEvent(id: number): Promise<void> {
  await db.delete(events).where(eq(events.id, id));
}

export async function getEvent(id: number): Promise<CalendarEvent | null> {
  const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return (rows[0] as CalendarEvent) ?? null;
}
