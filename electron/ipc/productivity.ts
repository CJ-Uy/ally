import { dialog, ipcMain } from "electron";
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { app } from "electron";
import { bootstrapSchema } from "../data/bootstrap";
import { getProfile, saveProfile } from "../data/profile";
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
} from "../data/subjects";
import { saveSyllabus } from "../data/syllabi";
import {
  createTask,
  deleteTask,
  listOverdueTasks,
  listTasks,
  listTasksForSubject,
  listTodayTasks,
  updateTask,
  type TaskStatus,
} from "../data/tasks";
import {
  createEvent,
  deleteEvent,
  listEvents,
  listUpcomingEvents,
  updateEvent,
  type EventType,
} from "../data/events";
import { parseSyllabusPdf } from "../agent/syllabusParser";
import { sendToPlanner } from "../agent/studyPlanner";

interface PlannerChat {
  history: Array<{ role: "user" | "model"; text: string }>;
}

const plannerSession: PlannerChat = { history: [] };

function dateOrNull(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : new Date(t);
  }
  return null;
}

function syllabiDir(): string {
  const dir = path.join(app.getPath("userData"), "syllabi");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function copyToUserData(sourcePath: string): string {
  const dir = syllabiDir();
  const base = path.basename(sourcePath);
  const dest = path.join(dir, `${Date.now()}-${base}`);
  copyFileSync(sourcePath, dest);
  return dest;
}

async function applyParsedToSubject(
  subjectId: number,
  parsed: Awaited<ReturnType<typeof parseSyllabusPdf>>,
): Promise<{ deadlinesCreated: number; eventsCreated: number }> {
  let deadlinesCreated = 0;
  let eventsCreated = 0;

  console.log(
    `[apply] subject ${subjectId}: ${parsed.deadlines.length} deadlines, ${parsed.exams.length} exams to insert`,
  );

  for (const d of parsed.deadlines) {
    const due = composeDate(d.dueDate, d.dueTime);
    if (!due) {
      console.warn(
        `[apply] deadline "${d.title}" had unparseable date "${d.dueDate}" — creating task with null dueDate`,
      );
    }
    await createTask({
      subjectId,
      title: due ? d.title : `${d.title} (review date: ${d.dueDate ?? "missing"})`,
      dueDate: due,
      estimatedMinutes: d.estimatedMinutes ?? null,
      createdBy: "ai",
    });
    deadlinesCreated++;
  }

  for (const e of parsed.exams) {
    const starts = composeDate(e.date, e.time);
    if (!starts) {
      console.warn(
        `[apply] exam "${e.title}" had no usable date — creating as a dateless task instead`,
      );
      await createTask({
        subjectId,
        title: `${e.title} (set date)`,
        description:
          e.weightPercent !== null
            ? `Exam worth ${e.weightPercent}% — date TBD`
            : `Exam — date TBD`,
        dueDate: null,
        estimatedMinutes: null,
        createdBy: "ai",
      });
      deadlinesCreated++;
      continue;
    }
    await createEvent({
      subjectId,
      title: e.title,
      type: "exam",
      startsAt: starts,
    });
    eventsCreated++;
  }

  console.log(
    `[apply] created ${deadlinesCreated} task(s), ${eventsCreated} event(s) for subject ${subjectId}`,
  );
  return { deadlinesCreated, eventsCreated };
}

function composeDate(date: string | null, time: string | null): Date | null {
  if (!date) return null;
  const iso = time ? `${date}T${time}:00` : `${date}T00:00:00`;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : new Date(t);
}

export function registerProductivityIpc() {
  ipcMain.handle("schema:bootstrap", async () => {
    await bootstrapSchema();
    return { ok: true };
  });

  // Profile
  ipcMain.handle("profile:get", async () => {
    const p = await getProfile();
    return p
      ? {
          id: p.id,
          studyHoursPerWeek: p.studyHoursPerWeek,
          educationLevel: p.educationLevel,
          onboardedAt: p.onboardedAt.toISOString(),
        }
      : null;
  });

  ipcMain.handle(
    "profile:save",
    async (
      _e,
      payload: { studyHoursPerWeek: number; educationLevel: string },
    ) => {
      const saved = await saveProfile({
        studyHoursPerWeek: Number(payload.studyHoursPerWeek),
        educationLevel: String(payload.educationLevel),
      });
      return {
        id: saved.id,
        studyHoursPerWeek: saved.studyHoursPerWeek,
        educationLevel: saved.educationLevel,
        onboardedAt: saved.onboardedAt.toISOString(),
      };
    },
  );

  // Subjects
  ipcMain.handle("subjects:list", async () => {
    const rows = await listSubjects();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      educationLevel: r.educationLevel,
      color: r.color,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  ipcMain.handle(
    "subjects:create",
    async (_e, payload: { name: string; educationLevel: string }) => {
      const row = await createSubject({
        name: payload.name,
        educationLevel: payload.educationLevel,
      });
      return {
        id: row.id,
        name: row.name,
        educationLevel: row.educationLevel,
        color: row.color,
        createdAt: row.createdAt.toISOString(),
      };
    },
  );

  ipcMain.handle(
    "subjects:update",
    async (
      _e,
      payload: { id: number; patch: { name?: string; color?: string } },
    ) => {
      await updateSubject(payload.id, payload.patch);
      return { ok: true };
    },
  );

  ipcMain.handle("subjects:delete", async (_e, payload: { id: number }) => {
    await deleteSubject(payload.id);
    return { ok: true };
  });

  // Syllabus
  ipcMain.handle("syllabus:pickPdf", async () => {
    const result = await dialog.showOpenDialog({
      title: "Select syllabus PDF",
      properties: ["openFile"],
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(
    "syllabus:parseAndApply",
    async (
      _e,
      payload: { subjectId: number; filePath: string },
    ) => {
      const stored = copyToUserData(payload.filePath);
      const parsed = await parseSyllabusPdf(stored);
      const counts = await applyParsedToSubject(payload.subjectId, parsed);
      await saveSyllabus({
        subjectId: payload.subjectId,
        fileName: path.basename(stored),
        gradingBreakdown: parsed.gradingBreakdown,
        difficulty: parsed.difficulty,
        topics: parsed.topics,
        rawSummary: JSON.stringify({
          courseName: parsed.courseName,
          deadlines: parsed.deadlines.length,
          exams: parsed.exams.length,
        }),
      });
      return {
        parsed,
        deadlinesCreated: counts.deadlinesCreated,
        eventsCreated: counts.eventsCreated,
      };
    },
  );

  // Tasks
  ipcMain.handle("tasks:list", async () => {
    const rows = await listTasks();
    return rows.map(serializeTask);
  });

  ipcMain.handle("tasks:listToday", async () => {
    const rows = await listTodayTasks();
    return rows.map(serializeTask);
  });

  ipcMain.handle("tasks:listOverdue", async () => {
    const rows = await listOverdueTasks();
    return rows.map(serializeTask);
  });

  ipcMain.handle(
    "tasks:listForSubject",
    async (_e, payload: { subjectId: number }) => {
      const rows = await listTasksForSubject(payload.subjectId);
      return rows.map(serializeTask);
    },
  );

  ipcMain.handle(
    "tasks:create",
    async (
      _e,
      payload: {
        subjectId: number;
        title: string;
        description?: string;
        dueDate?: string | null;
        estimatedMinutes?: number | null;
      },
    ) => {
      const row = await createTask({
        subjectId: payload.subjectId,
        title: payload.title,
        description: payload.description ?? null,
        dueDate: dateOrNull(payload.dueDate),
        estimatedMinutes: payload.estimatedMinutes ?? null,
        createdBy: "user",
      });
      return serializeTask(row);
    },
  );

  ipcMain.handle(
    "tasks:update",
    async (
      _e,
      payload: {
        id: number;
        patch: {
          title?: string;
          description?: string | null;
          dueDate?: string | null;
          estimatedMinutes?: number | null;
          status?: TaskStatus;
        };
      },
    ) => {
      const patch: Parameters<typeof updateTask>[1] = {};
      if (payload.patch.title !== undefined) patch.title = payload.patch.title;
      if (payload.patch.description !== undefined)
        patch.description = payload.patch.description;
      if (payload.patch.dueDate !== undefined)
        patch.dueDate = dateOrNull(payload.patch.dueDate);
      if (payload.patch.estimatedMinutes !== undefined)
        patch.estimatedMinutes = payload.patch.estimatedMinutes;
      if (payload.patch.status !== undefined) patch.status = payload.patch.status;
      const row = await updateTask(payload.id, patch);
      return row ? serializeTask(row) : null;
    },
  );

  ipcMain.handle("tasks:delete", async (_e, payload: { id: number }) => {
    await deleteTask(payload.id);
    return { ok: true };
  });

  // Events
  ipcMain.handle("events:list", async () => {
    const rows = await listEvents();
    return rows.map(serializeEvent);
  });

  ipcMain.handle("events:listUpcoming", async () => {
    const rows = await listUpcomingEvents(7);
    return rows.map(serializeEvent);
  });

  ipcMain.handle(
    "events:create",
    async (
      _e,
      payload: {
        subjectId: number;
        title: string;
        type: EventType;
        startsAt: string;
        endsAt?: string | null;
      },
    ) => {
      const starts = dateOrNull(payload.startsAt);
      if (!starts) throw new Error("startsAt is required and must be a valid date");
      const row = await createEvent({
        subjectId: payload.subjectId,
        title: payload.title,
        type: payload.type,
        startsAt: starts,
        endsAt: dateOrNull(payload.endsAt ?? null),
      });
      return serializeEvent(row);
    },
  );

  ipcMain.handle(
    "events:update",
    async (
      _e,
      payload: {
        id: number;
        patch: {
          title?: string;
          type?: EventType;
          startsAt?: string;
          endsAt?: string | null;
        };
      },
    ) => {
      const patch: Parameters<typeof updateEvent>[1] = {};
      if (payload.patch.title !== undefined) patch.title = payload.patch.title;
      if (payload.patch.type !== undefined) patch.type = payload.patch.type;
      if (payload.patch.startsAt !== undefined) {
        const d = dateOrNull(payload.patch.startsAt);
        if (d) patch.startsAt = d;
      }
      if (payload.patch.endsAt !== undefined)
        patch.endsAt = dateOrNull(payload.patch.endsAt);
      const row = await updateEvent(payload.id, patch);
      return row ? serializeEvent(row) : null;
    },
  );

  ipcMain.handle("events:delete", async (_e, payload: { id: number }) => {
    await deleteEvent(payload.id);
    return { ok: true };
  });

  // Planner chat
  ipcMain.handle("planner:chat", async (_e, payload: { text: string }) => {
    const text = String(payload?.text ?? "").trim();
    if (!text) return { visibleText: "" };

    const history = plannerSession.history.slice();
    plannerSession.history.push({ role: "user", text });

    console.log(`\n[planner:chat] ─── new turn (${new Date().toISOString()}) ───`);
    const started = Date.now();

    const TIMEOUT_MS = 60_000;
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(new Error(`Planner timed out after ${TIMEOUT_MS / 1000}s`)),
        TIMEOUT_MS,
      );
    });

    try {
      const reply = await Promise.race([
        sendToPlanner(history, text),
        timeout,
      ]);
      const elapsed = Date.now() - started;
      console.log(`[planner:chat] completed in ${elapsed}ms`);
      plannerSession.history.push({ role: "model", text: reply.visibleText });
      return { visibleText: reply.visibleText };
    } catch (err) {
      const elapsed = Date.now() - started;
      console.error(`[planner:chat] failed after ${elapsed}ms:`, err);
      const message = err instanceof Error ? err.message : String(err);
      // Don't push the error into history so the next turn can try fresh.
      plannerSession.history.pop();
      return {
        visibleText: `Planner error: ${message}\n\n(Check the Electron main-process console for the full stack trace.)`,
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  });

  ipcMain.handle("planner:reset", async () => {
    plannerSession.history = [];
    return { ok: true };
  });

  ipcMain.handle("planner:history", async () => {
    return plannerSession.history.slice();
  });
}

function serializeTask(row: {
  id: number;
  subjectId: number;
  title: string;
  description: string | null;
  dueDate: Date | null;
  estimatedMinutes: number | null;
  status: string;
  parentTaskId: number | null;
  createdBy: string;
  createdAt: Date;
}) {
  return {
    id: row.id,
    subjectId: row.subjectId,
    title: row.title,
    description: row.description,
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    estimatedMinutes: row.estimatedMinutes,
    status: row.status,
    parentTaskId: row.parentTaskId,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeEvent(row: {
  id: number;
  subjectId: number;
  title: string;
  type: string;
  startsAt: Date;
  endsAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    subjectId: row.subjectId,
    title: row.title,
    type: row.type,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
