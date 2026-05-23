import { listSubjects } from "./subjects";
import { listTasks, type Task } from "./tasks";

export interface AtRiskItem {
  taskId: number;
  title: string;
  subjectId: number;
  subjectName: string;
  dueDate: string;
  estimatedMinutes: number;
  minutesUntilDue: number;
  reason: "overdue" | "insufficient_time";
  shortfallMinutes: number;
}

export async function analyzeAtRiskTasks(now: Date = new Date()): Promise<AtRiskItem[]> {
  const [tasks, subjects] = await Promise.all([listTasks(), listSubjects()]);
  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

  const out: AtRiskItem[] = [];
  for (const t of tasks) {
    if (t.status === "done") continue;
    if (!t.dueDate) continue;
    const est = t.estimatedMinutes ?? 0;
    const minutesUntilDue = Math.floor((t.dueDate.getTime() - now.getTime()) / 60_000);

    if (minutesUntilDue < 0) {
      out.push({
        taskId: t.id,
        title: t.title,
        subjectId: t.subjectId,
        subjectName: subjectMap.get(t.subjectId) ?? "Unknown",
        dueDate: t.dueDate.toISOString(),
        estimatedMinutes: est,
        minutesUntilDue,
        reason: "overdue",
        shortfallMinutes: est - minutesUntilDue,
      });
    } else if (est > 0 && minutesUntilDue < est) {
      out.push({
        taskId: t.id,
        title: t.title,
        subjectId: t.subjectId,
        subjectName: subjectMap.get(t.subjectId) ?? "Unknown",
        dueDate: t.dueDate.toISOString(),
        estimatedMinutes: est,
        minutesUntilDue,
        reason: "insufficient_time",
        shortfallMinutes: est - minutesUntilDue,
      });
    }
  }

  out.sort((a, b) => {
    if (a.reason !== b.reason) return a.reason === "overdue" ? -1 : 1;
    return b.shortfallMinutes - a.shortfallMinutes;
  });

  return out;
}

export interface NextTaskCandidate {
  taskId: number;
  title: string;
  subjectName: string;
  dueDate: string | null;
  estimatedMinutes: number | null;
  hoursUntilDue: number | null;
  urgencyScore: number;
  reason: string;
}

export async function rankNextTasks(
  limit = 5,
  now: Date = new Date(),
): Promise<NextTaskCandidate[]> {
  const [tasks, subjects] = await Promise.all([listTasks(), listSubjects()]);
  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
  const open = tasks.filter((t: Task) => t.status !== "done");

  const scored: NextTaskCandidate[] = open.map((t) => {
    const hoursUntilDue = t.dueDate
      ? (t.dueDate.getTime() - now.getTime()) / 3_600_000
      : null;

    let urgencyScore: number;
    let reason: string;
    if (hoursUntilDue === null) {
      urgencyScore = 1_000_000;
      reason = "no due date set";
    } else if (hoursUntilDue < 0) {
      urgencyScore = hoursUntilDue;
      reason = `overdue by ~${Math.abs(Math.round(hoursUntilDue))}h`;
    } else if (hoursUntilDue < 24) {
      urgencyScore = hoursUntilDue;
      reason = `due in ~${Math.max(1, Math.round(hoursUntilDue))}h`;
    } else {
      urgencyScore = hoursUntilDue;
      reason = `due in ~${Math.round(hoursUntilDue / 24)}d`;
    }

    return {
      taskId: t.id,
      title: t.title,
      subjectName: subjectMap.get(t.subjectId) ?? "Unknown",
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      estimatedMinutes: t.estimatedMinutes,
      hoursUntilDue,
      urgencyScore,
      reason,
    };
  });

  scored.sort((a, b) => a.urgencyScore - b.urgencyScore);
  return scored.slice(0, limit);
}
