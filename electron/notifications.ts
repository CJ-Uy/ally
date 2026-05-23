import { Notification } from "electron";
import { analyzeAtRiskTasks } from "./data/analysis";
import { listTodayTasks } from "./data/tasks";
import { getProfile, type NotificationToggleKey } from "./data/profile";
import { currentStreakDays, getTodayActivity } from "./data/activity";

type Category =
  | "notifyAtRisk"
  | "notifyDueToday"
  | "notifyStreakDanger"
  | "notifyChatResponse";

async function isEnabled(category: Category): Promise<boolean> {
  try {
    const profile = await getProfile();
    if (!profile) return false;
    return profile[category as NotificationToggleKey] === true;
  } catch (err) {
    console.warn(`[notifications] toggle lookup failed for ${category}:`, err);
    return false;
  }
}

function show(title: string, body: string): void {
  if (!Notification.isSupported()) {
    console.log(`[notifications] (unsupported) ${title} — ${body}`);
    return;
  }
  try {
    new Notification({ title, body, silent: false }).show();
  } catch (err) {
    console.warn("[notifications] show failed:", err);
  }
}

export async function notifyAtRisk(): Promise<void> {
  if (!(await isEnabled("notifyAtRisk"))) return;
  const items = await analyzeAtRiskTasks();
  if (items.length === 0) return;
  const head = items[0];
  const rest = items.length - 1;
  const subject = head.subjectName ? `${head.subjectName}: ` : "";
  const body =
    rest > 0
      ? `${subject}"${head.title}" is at risk (and ${rest} more). Open Ally to review.`
      : `${subject}"${head.title}" is at risk. Open Ally to review.`;
  show("Deadline at risk", body);
}

export async function notifyDueToday(): Promise<void> {
  if (!(await isEnabled("notifyDueToday"))) return;
  const tasks = await listTodayTasks();
  if (tasks.length === 0) return;
  const head = tasks[0];
  const rest = tasks.length - 1;
  const body =
    rest > 0
      ? `"${head.title}" is due today (and ${rest} more).`
      : `"${head.title}" is due today.`;
  show("Due today", body);
}

export async function notifyStreakDanger(): Promise<void> {
  if (!(await isEnabled("notifyStreakDanger"))) return;
  const [activity, streak] = await Promise.all([
    getTodayActivity(),
    currentStreakDays(),
  ]);
  if (activity.sessionsCompleted > 0) return;
  if (streak <= 0) return;
  const body =
    streak === 1
      ? `Don't break your 1-day streak — start a session today.`
      : `You're on a ${streak}-day streak. Get one session in before midnight to keep it alive.`;
  show("Streak in danger", body);
}

export async function notifyPlannerReply(text: string): Promise<void> {
  if (!(await isEnabled("notifyChatResponse"))) return;
  const body = text.length > 140 ? `${text.slice(0, 137)}…` : text;
  show("Study Planner replied", body);
}

// "Morning" is anything before noon local time. Run all three checks at app
// start; rerun once per day via scheduleDailyChecks().
export async function runAppOpenChecks(): Promise<void> {
  const now = new Date();
  await notifyAtRisk();
  if (now.getHours() < 12) {
    await notifyDueToday();
  }
  // Run streak-danger check after 4pm so it doesn't fire first thing in the morning.
  if (now.getHours() >= 16) {
    await notifyStreakDanger();
  }
}

let dailyTimer: NodeJS.Timeout | null = null;

function msUntil(hour: number): number {
  const target = new Date();
  target.setHours(hour, 0, 0, 0);
  if (target.getTime() <= Date.now()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - Date.now();
}

export function scheduleDailyChecks(): void {
  if (dailyTimer) return;
  const tick = async () => {
    const hour = new Date().getHours();
    try {
      if (hour < 12) {
        await notifyDueToday();
        await notifyAtRisk();
      }
      if (hour >= 16) {
        await notifyStreakDanger();
      }
    } catch (err) {
      console.warn("[notifications] daily tick failed:", err);
    }
    // Schedule the next tick at the next 8am OR 6pm boundary, whichever is sooner.
    const nextHour = hour < 8 ? 8 : hour < 18 ? 18 : 8;
    dailyTimer = setTimeout(() => void tick(), msUntil(nextHour));
  };
  dailyTimer = setTimeout(() => void tick(), msUntil(8));
}
