import { readFileSync } from "node:fs";
import path from "node:path";
import { getProfile } from "../data/profile";
import { listOverdueTasks, listTodayTasks } from "../data/tasks";
import { listUpcomingEvents } from "../data/events";
import { listSubjects } from "../data/subjects";
import { currentStreakDays, getTodayActivity } from "../data/activity";
import {
  elapsedMinutes,
  getCurrentSubject,
  isSessionActive,
  sessionStartedAtIso,
} from "../session";

export interface MockContext {
  studySession: {
    active: boolean;
    startedAt: string;
    elapsedMinutes: number;
    currentSubject: string;
  };
  todayTasks: Array<{
    id: string;
    subject: string;
    title: string;
    done: boolean;
  }>;
  calendar: Array<{
    title: string;
    date: string;
    type: string;
  }>;
  streaks: {
    currentDays: number;
    breaksUsedToday: number;
  };
  userProfile: {
    studyHoursPerWeek: number;
    educationLevel: string;
  };
}

function mockContextPath(): string {
  const appRoot = process.env.APP_ROOT ?? process.cwd();
  return path.join(appRoot, "mock-context.json");
}

// Retained as a last-resort fallback if Turso is unreachable. Scope 4 wires
// `buildLiveContext()` as the primary source.
export function readMockContext(): MockContext {
  const raw = readFileSync(mockContextPath(), "utf-8");
  return JSON.parse(raw) as MockContext;
}

export async function buildLiveContext(): Promise<MockContext> {
  const [
    profile,
    subjects,
    todayTasks,
    overdueTasks,
    upcomingEvents,
    activity,
    streakDays,
  ] = await Promise.all([
    getProfile(),
    listSubjects(),
    listTodayTasks(),
    listOverdueTasks(),
    listUpcomingEvents(7),
    getTodayActivity(),
    currentStreakDays(),
  ]);

  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

  // De-dupe: listOverdueTasks ⊂ listTodayTasks already (both are open tasks
  // due ≤ end-of-today). Use a Map keyed by id.
  const taskBag = new Map<number, (typeof todayTasks)[number]>();
  for (const t of todayTasks) taskBag.set(t.id, t);
  for (const t of overdueTasks) taskBag.set(t.id, t);

  const todayTaskShape = Array.from(taskBag.values()).map((t) => ({
    id: String(t.id),
    subject: subjectMap.get(t.subjectId) ?? "Unknown",
    title: t.title,
    done: t.status === "done",
  }));

  const calendarShape = upcomingEvents.map((e) => ({
    title: e.title,
    date: e.startsAt.toISOString(),
    type: e.type,
  }));

  return {
    studySession: {
      active: isSessionActive(),
      startedAt: sessionStartedAtIso() ?? new Date().toISOString(),
      elapsedMinutes: elapsedMinutes(),
      currentSubject: getCurrentSubject(),
    },
    todayTasks: todayTaskShape,
    calendar: calendarShape,
    streaks: {
      currentDays: streakDays,
      breaksUsedToday: activity.breaksUsed,
    },
    userProfile: {
      studyHoursPerWeek: profile?.studyHoursPerWeek ?? 15,
      educationLevel: profile?.educationLevel ?? "college",
    },
  };
}

function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((target - now) / (24 * 60 * 60 * 1000)));
}

export function formatContext(ctx: MockContext): string {
  const doneTasks = ctx.todayTasks.filter((t) => t.done).length;
  const totalTasks = ctx.todayTasks.length;
  const remaining = ctx.todayTasks
    .filter((t) => !t.done)
    .map((t) => `"${t.title}"`)
    .join(", ");
  const remainingText = remaining.length > 0 ? remaining : "none";

  const upcoming = ctx.calendar
    .map((c) => `${c.title} in ${daysUntil(c.date)} days`)
    .join("; ");
  const upcomingText = upcoming.length > 0 ? upcoming : "nothing scheduled";

  return [
    "USER'S CURRENT STUDY CONTEXT:",
    `- Currently studying: ${ctx.studySession.currentSubject} (${ctx.studySession.elapsedMinutes} minutes into session)`,
    `- Today's tasks: ${doneTasks}/${totalTasks} done. Remaining: ${remainingText}`,
    `- Upcoming: ${upcomingText}`,
    `- Streak: ${ctx.streaks.currentDays} days. Breaks used today: ${ctx.streaks.breaksUsedToday}`,
    `- Profile: ${ctx.userProfile.educationLevel} student, ${ctx.userProfile.studyHoursPerWeek} hrs/week target`,
  ].join("\n");
}
