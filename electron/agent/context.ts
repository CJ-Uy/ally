import { readFileSync } from "node:fs";
import path from "node:path";

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

export function readMockContext(): MockContext {
  const raw = readFileSync(mockContextPath(), "utf-8");
  return JSON.parse(raw) as MockContext;
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
