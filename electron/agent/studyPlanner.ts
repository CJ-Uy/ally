import {
  FunctionCallingMode,
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
} from "@google/generative-ai";
import type { ChatMessage } from "../session";
import { getProfile } from "../data/profile";
import {
  createSubject,
  getSubject,
  listSubjects,
  type Subject,
} from "../data/subjects";
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
  type Task,
  type TaskStatus,
} from "../data/tasks";
import {
  createEvent,
  deleteEvent,
  getEvent,
  listEvents,
  updateEvent,
  type CalendarEvent,
  type EventType,
} from "../data/events";
import { analyzeAtRiskTasks, rankNextTasks } from "../data/analysis";
import { listSyllabi } from "../data/syllabi";
import { currentStreakDays, getTodayActivity } from "../data/activity";
import {
  elapsedMinutes as sessionElapsedMinutes,
  getCurrentSubject,
  isSessionActive,
} from "../session";
import { modelFor } from "./models";

export const studyPlannerAgent = {
  name: "Study Planner",
  description:
    "An AI agent that helps the user manage their study plan — creating, updating, and organizing tasks and calendar events through conversation.",
  instructions: `You are Study Planner, the user's autonomous study chief of staff. The user wants action, not interrogation. Default to ACTING, not asking.

═══════════════════════════════════════════════════════════
PRIME DIRECTIVE: ACT, DON'T ASK
═══════════════════════════════════════════════════════════

If the snapshot contains the answer, USE IT. Do not ask the user to confirm or supply information that's already in the LIVE USER STATE block. Reading the snapshot is your job, not theirs.

You may ask AT MOST ONE clarifying question per turn, and only when ALL of the following are true:
  1. The answer is genuinely not derivable from the snapshot, syllabi, tasks, events, OR sensible defaults.
  2. Guessing wrong would create non-trivial work to undo (e.g. wrong subject, wrong week).
  3. You cannot just pick a reasonable default and say "I picked X — tell me if you want Y instead."

For anything else: pick the most reasonable interpretation, do the work, and report what you did. The user can correct you in a follow-up — that's cheap. Forcing them to fill out a form is expensive.

═══════════════════════════════════════════════════════════
INFERENCE PLAYBOOK — apply these patterns automatically
═══════════════════════════════════════════════════════════

A) "Study for the <exam> exam" / "plan my <exam> studying":
  → Find the exam in the Calendar section of the snapshot (matching subject + type "exam" + title containing "midterm"/"final"/etc).
  → Find every open task in that subject whose due date is BEFORE the exam date. Those are the relevant prep materials.
  → Tasks due AFTER the exam are NOT relevant — ignore them for this plan.
  → Build a sequence of study tasks (review sessions, practice problems, mock-exam pass) staggered between today and 24h before the exam.
  → Use the user's requested prefix verbatim if they gave one (e.g. "[ME - Study]"). Otherwise prefix with "[<Subject> Study]".
  → Estimate each task: 60-90m for content review, 45-60m for a problem-set review, 90-120m for a full practice pass.
  → CREATE all the tasks in this turn with create_task. Do not just describe them. Do not ask for approval.

B) "Plan my week" / "what's the plan":
  → Look at every open task with a due date in the next 7 days. Group by day. Propose a study order inline (no tool call) — no rescheduling unless the user said to.

C) "Break this down" with no task id specified:
  → If the snapshot has exactly one obvious oversized task (>120m estimate, or matches the user's keywords), use it. Otherwise pick the one most relevant to what they said. Only ask which one if there are 3+ plausible matches.

D) Anything ambiguous about a date:
  → Default to ISO date math from the snapshot's "Current date/time". Never ask "what's today's date?".

═══════════════════════════════════════════════════════════
ANTI-PATTERNS — these are FORBIDDEN
═══════════════════════════════════════════════════════════

✗ "I need to know the exact date of your Math midterm." — The snapshot lists every event in the next 120 days. Look at it.
✗ "Could you clarify which problem sets are most relevant?" — Tasks due before the exam are relevant; tasks due after are not. That's the rule. Apply it.
✗ "I'll create study tasks. Once you confirm, I'll proceed." — No. Create them now and tell the user what you created.
✗ "I cannot access your calendar." — You have it. It's right above this prompt under "Calendar (events…)".
✗ Long preambles ("To start, I need…", "First, let me…", "Once I have this information…"). Just do the thing.
✗ Dumping JSON or tool call arguments at the user.
✗ Confirming creates. Creating tasks is NOT destructive — it's the whole point. Just create and report.

═══════════════════════════════════════════════════════════
WHEN CONFIRMATION IS ACTUALLY REQUIRED
═══════════════════════════════════════════════════════════

Only confirm before:
- Deleting tasks or events (delete_task, delete_event)
- Bulk updates touching 5+ tasks
- Rescheduling multiple existing tasks (propose_reschedule)

Confirmation = ONE short sentence ("About to delete 'X' — confirm?"), then wait.

Everything else — create_task, create_event, mark_task_done, update_task, breakdown_task, estimate_duration — acts immediately, no confirmation.

═══════════════════════════════════════════════════════════
DATA ACCESS — you have full read/write
═══════════════════════════════════════════════════════════

The LIVE USER STATE snapshot is your primary source of truth. It includes:
- Profile (study hours, education level), today's streak / sessions / breaks, active session info.
- Every subject with familiarity, syllabus difficulty, grading breakdown, topic list.
- Every open task (up to 60) sorted by due date, with parent links + status.
- Recently completed tasks (last 10).
- Every event (exams, classes, deadlines) from 7 days ago to 120 days out.

For read-only queries, DO NOT call list_subjects / list_tasks / list_events — the data is right above. Only call list_* tools if something is genuinely outside the snapshot window.

═══════════════════════════════════════════════════════════
SMART BEHAVIOR TOOLS
═══════════════════════════════════════════════════════════

- "What should I work on next?" → suggest_next_task → pick ONE, name it by id, one-sentence reason.
- "What's at risk?" / "Am I behind?" → check_at_risk → list each with reason, or say "nothing at risk" plainly.
- "Break <task> down" → breakdown_task with parentTaskId and 3-6 subtasks staggered before the parent's due date.
- New task without an estimate → estimate_duration. Base on: type (reading 30m, problem set 45-60m, project chunk 90m, study session 60-90m), syllabus difficulty, study_hours_per_week, AND subject familiarity (beginner +30-50%, familiar baseline, confident −20-30%).
- "Reschedule my week" → check_at_risk first → propose inline → propose_reschedule once the user confirms. Tasks only, never events.

═══════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════

After acting, respond in this shape:
1. ONE sentence summarizing what you did, with concrete counts/titles.
2. (Optional) ONE sentence on follow-up the user might want.

Examples:
✓ "Created 6 [ME - Study] tasks staggered Jun 14 → Jun 21, totaling ~7h. Want me to also schedule mock-exam blocks?"
✓ "Broke 'Final project' into 4 subtasks across Jun 18-25, ~6h total."
✓ "Marked PSet 1 done."

Never lead with caveats. Never repeat the user's request back at them. Never dump tool JSON. If a tool fails, say so in plain English in one sentence and propose a next step.

CRITICAL FALLBACK: every turn MUST produce at least one visible sentence to the user. Never return empty text.`,
  knowledge: {
    note: "Live data is queried via tools (list_subjects, list_tasks, list_events). No preloaded knowledge.",
  },
  triggers: ["on_planner_chat_message"],
} as const;

let client: GoogleGenerativeAI | null = null;
function getClient(): GoogleGenerativeAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  client = new GoogleGenerativeAI(apiKey);
  return client;
}

const tools: FunctionDeclaration[] = [
  {
    name: "list_subjects",
    description: "List all subjects the user is tracking.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "list_tasks",
    description: "List tasks. Optionally filter by subject name or status.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        subjectName: { type: SchemaType.STRING },
        status: {
          type: SchemaType.STRING,
          description: "todo | in_progress | done",
        },
      },
    },
  },
  {
    name: "list_events",
    description: "List calendar events.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        subjectName: { type: SchemaType.STRING },
      },
    },
  },
  {
    name: "create_task",
    description: "Create a new task for a subject.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        subjectName: { type: SchemaType.STRING },
        title: { type: SchemaType.STRING },
        dueDate: {
          type: SchemaType.STRING,
          description: "ISO 8601 date or datetime, e.g. 2026-05-30 or 2026-05-30T15:00",
        },
        estimatedMinutes: { type: SchemaType.NUMBER },
        description: { type: SchemaType.STRING },
      },
      required: ["subjectName", "title"],
    },
  },
  {
    name: "update_task",
    description: "Update an existing task by id.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.NUMBER },
        title: { type: SchemaType.STRING },
        dueDate: { type: SchemaType.STRING },
        estimatedMinutes: { type: SchemaType.NUMBER },
        description: { type: SchemaType.STRING },
        status: {
          type: SchemaType.STRING,
          description: "todo | in_progress | done",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "mark_task_done",
    description: "Mark a task as done by id.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.NUMBER },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_task",
    description: "Delete a task by id. Confirm with user first.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.NUMBER },
      },
      required: ["id"],
    },
  },
  {
    name: "create_event",
    description: "Create a calendar event (exam, class, deadline, study_block).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        subjectName: { type: SchemaType.STRING },
        title: { type: SchemaType.STRING },
        type: {
          type: SchemaType.STRING,
          description: "exam | class | deadline | study_block",
        },
        startsAt: {
          type: SchemaType.STRING,
          description: "ISO 8601 datetime",
        },
        endsAt: {
          type: SchemaType.STRING,
          description: "ISO 8601 datetime, optional",
        },
      },
      required: ["subjectName", "title", "type", "startsAt"],
    },
  },
  {
    name: "update_event",
    description: "Update a calendar event by id.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.NUMBER },
        title: { type: SchemaType.STRING },
        startsAt: { type: SchemaType.STRING },
        endsAt: { type: SchemaType.STRING },
        type: { type: SchemaType.STRING },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_event",
    description: "Delete a calendar event by id.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.NUMBER },
      },
      required: ["id"],
    },
  },
  {
    name: "get_user_context",
    description:
      "Get the user's profile (study hours/week, education level) and a summary of current load.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "suggest_next_task",
    description:
      "Return the top open tasks ranked by urgency (deadline distance, overdue status). Use when the user asks what to work on next.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.NUMBER,
          description: "How many candidates to return (default 5).",
        },
      },
    },
  },
  {
    name: "check_at_risk",
    description:
      "Scan all open tasks and return those at risk: either overdue, or where remaining time is less than estimated work. Use when the user asks what's at risk, what's overdue, or whether they're behind.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "breakdown_task",
    description:
      "Break a parent task into subtasks. Creates each subtask with parentTaskId pointing at the parent. Use when the user flags a task as too big or asks to break it down.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        parentTaskId: { type: SchemaType.NUMBER },
        subtasks: {
          type: SchemaType.ARRAY,
          description: "3-6 focused subtasks staggered before the parent's due date.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              dueDate: {
                type: SchemaType.STRING,
                description: "ISO 8601 date or datetime",
              },
              estimatedMinutes: { type: SchemaType.NUMBER },
              description: { type: SchemaType.STRING },
            },
            required: ["title"],
          },
        },
      },
      required: ["parentTaskId", "subtasks"],
    },
  },
  {
    name: "estimate_duration",
    description:
      "Set or update a task's estimatedMinutes. Use when a task has no estimate or the user asks how long something will take.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        taskId: { type: SchemaType.NUMBER },
        minutes: { type: SchemaType.NUMBER },
        reasoning: {
          type: SchemaType.STRING,
          description: "One short sentence explaining the estimate (not stored, just for logging).",
        },
      },
      required: ["taskId", "minutes"],
    },
  },
  {
    name: "propose_reschedule",
    description:
      "Apply a batch of new due dates to existing tasks. Only call after the user has confirmed the proposed plan in conversation. Never reschedules events.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        proposals: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              taskId: { type: SchemaType.NUMBER },
              newDueDate: {
                type: SchemaType.STRING,
                description: "ISO 8601 date or datetime",
              },
            },
            required: ["taskId", "newDueDate"],
          },
        },
      },
      required: ["proposals"],
    },
  },
];

type ToolArgs = Record<string, unknown>;

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function parseDate(input: unknown): Date | undefined {
  if (typeof input !== "string" || input.trim() === "") return undefined;
  const t = Date.parse(input);
  if (Number.isNaN(t)) return undefined;
  return new Date(t);
}

async function findSubjectByName(name: string): Promise<Subject | null> {
  const all = await listSubjects();
  const lower = name.trim().toLowerCase();
  return (
    all.find((s) => s.name.toLowerCase() === lower) ??
    all.find((s) => s.name.toLowerCase().includes(lower)) ??
    null
  );
}

async function ensureSubject(name: string): Promise<Subject> {
  const existing = await findSubjectByName(name);
  if (existing) return existing;
  const profile = await getProfile();
  return createSubject({
    name,
    educationLevel: profile?.educationLevel ?? "college",
  });
}

function compactTask(t: Task, subjectName: string) {
  return {
    id: t.id,
    subject: subjectName,
    title: t.title,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    estimatedMinutes: t.estimatedMinutes,
    status: t.status,
  };
}

function compactEvent(e: CalendarEvent, subjectName: string) {
  return {
    id: e.id,
    subject: subjectName,
    title: e.title,
    type: e.type,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt ? e.endsAt.toISOString() : null,
  };
}

async function runTool(name: string, args: ToolArgs): Promise<unknown> {
  switch (name) {
    case "list_subjects": {
      const all = await listSubjects();
      return all.map((s) => ({ id: s.id, name: s.name, color: s.color }));
    }
    case "list_tasks": {
      const subjectName = asString(args.subjectName);
      const status = asString(args.status) as TaskStatus | undefined;
      const all = await listTasks();
      const subjects = await listSubjects();
      const byId = new Map(subjects.map((s) => [s.id, s.name]));
      let filtered = all;
      if (subjectName) {
        const subj = await findSubjectByName(subjectName);
        filtered = subj ? filtered.filter((t) => t.subjectId === subj.id) : [];
      }
      if (status) filtered = filtered.filter((t) => t.status === status);
      return filtered.map((t) => compactTask(t, byId.get(t.subjectId) ?? "Unknown"));
    }
    case "list_events": {
      const subjectName = asString(args.subjectName);
      const all = await listEvents();
      const subjects = await listSubjects();
      const byId = new Map(subjects.map((s) => [s.id, s.name]));
      let filtered = all;
      if (subjectName) {
        const subj = await findSubjectByName(subjectName);
        filtered = subj ? filtered.filter((e) => e.subjectId === subj.id) : [];
      }
      return filtered.map((e) => compactEvent(e, byId.get(e.subjectId) ?? "Unknown"));
    }
    case "create_task": {
      const subjectName = asString(args.subjectName);
      const title = asString(args.title);
      if (!subjectName || !title) return { error: "subjectName and title are required" };
      const subj = await ensureSubject(subjectName);
      const task = await createTask({
        subjectId: subj.id,
        title,
        description: asString(args.description) ?? null,
        dueDate: parseDate(args.dueDate) ?? null,
        estimatedMinutes: asNumber(args.estimatedMinutes) ?? null,
        createdBy: "ai",
      });
      return compactTask(task, subj.name);
    }
    case "update_task": {
      const id = asNumber(args.id);
      if (id === undefined) return { error: "id is required" };
      const existing = await getTask(id);
      if (!existing) return { error: `task ${id} not found` };
      const patch: Parameters<typeof updateTask>[1] = {};
      const title = asString(args.title);
      if (title !== undefined) patch.title = title;
      const description = asString(args.description);
      if (description !== undefined) patch.description = description;
      const due = parseDate(args.dueDate);
      if (due) patch.dueDate = due;
      const est = asNumber(args.estimatedMinutes);
      if (est !== undefined) patch.estimatedMinutes = est;
      const status = asString(args.status) as TaskStatus | undefined;
      if (status) patch.status = status;
      const updated = await updateTask(id, patch);
      if (!updated) return { error: `task ${id} not found after update` };
      const subj = await getSubject(updated.subjectId);
      return compactTask(updated, subj?.name ?? "Unknown");
    }
    case "mark_task_done": {
      const id = asNumber(args.id);
      if (id === undefined) return { error: "id is required" };
      const updated = await updateTask(id, { status: "done" });
      if (!updated) return { error: `task ${id} not found` };
      const subj = await getSubject(updated.subjectId);
      return compactTask(updated, subj?.name ?? "Unknown");
    }
    case "delete_task": {
      const id = asNumber(args.id);
      if (id === undefined) return { error: "id is required" };
      await deleteTask(id);
      return { deleted: id };
    }
    case "create_event": {
      const subjectName = asString(args.subjectName);
      const title = asString(args.title);
      const type = asString(args.type) as EventType | undefined;
      const starts = parseDate(args.startsAt);
      if (!subjectName || !title || !type || !starts) {
        return { error: "subjectName, title, type, startsAt are required" };
      }
      const subj = await ensureSubject(subjectName);
      const ev = await createEvent({
        subjectId: subj.id,
        title,
        type,
        startsAt: starts,
        endsAt: parseDate(args.endsAt) ?? null,
      });
      return compactEvent(ev, subj.name);
    }
    case "update_event": {
      const id = asNumber(args.id);
      if (id === undefined) return { error: "id is required" };
      const existing = await getEvent(id);
      if (!existing) return { error: `event ${id} not found` };
      const patch: Parameters<typeof updateEvent>[1] = {};
      const title = asString(args.title);
      if (title !== undefined) patch.title = title;
      const starts = parseDate(args.startsAt);
      if (starts) patch.startsAt = starts;
      const ends = parseDate(args.endsAt);
      if (ends) patch.endsAt = ends;
      const type = asString(args.type) as EventType | undefined;
      if (type) patch.type = type;
      const updated = await updateEvent(id, patch);
      if (!updated) return { error: `event ${id} not found after update` };
      const subj = await getSubject(updated.subjectId);
      return compactEvent(updated, subj?.name ?? "Unknown");
    }
    case "delete_event": {
      const id = asNumber(args.id);
      if (id === undefined) return { error: "id is required" };
      await deleteEvent(id);
      return { deleted: id };
    }
    case "get_user_context": {
      const profile = await getProfile();
      const allTasks = await listTasks();
      const open = allTasks.filter((t) => t.status !== "done");
      const overdue = open.filter((t) => t.dueDate && t.dueDate < new Date());
      return {
        profile: profile
          ? {
              studyHoursPerWeek: profile.studyHoursPerWeek,
              educationLevel: profile.educationLevel,
            }
          : null,
        openTaskCount: open.length,
        overdueCount: overdue.length,
        subjectCount: (await listSubjects()).length,
      };
    }
    case "suggest_next_task": {
      const limit = asNumber(args.limit) ?? 5;
      const candidates = await rankNextTasks(limit);
      return { candidates };
    }
    case "check_at_risk": {
      const items = await analyzeAtRiskTasks();
      return { count: items.length, items };
    }
    case "breakdown_task": {
      const parentTaskId = asNumber(args.parentTaskId);
      if (parentTaskId === undefined) return { error: "parentTaskId is required" };
      const parent = await getTask(parentTaskId);
      if (!parent) return { error: `task ${parentTaskId} not found` };

      const rawSubtasks = Array.isArray(args.subtasks) ? args.subtasks : [];
      if (rawSubtasks.length === 0) return { error: "subtasks array is required" };

      const created: Array<ReturnType<typeof compactTask>> = [];
      const subj = await getSubject(parent.subjectId);
      const subjName = subj?.name ?? "Unknown";

      for (const raw of rawSubtasks) {
        if (!raw || typeof raw !== "object") continue;
        const s = raw as ToolArgs;
        const title = asString(s.title);
        if (!title) continue;
        const task = await createTask({
          subjectId: parent.subjectId,
          title,
          description: asString(s.description) ?? null,
          dueDate: parseDate(s.dueDate) ?? null,
          estimatedMinutes: asNumber(s.estimatedMinutes) ?? null,
          parentTaskId: parent.id,
          createdBy: "ai",
        });
        created.push(compactTask(task, subjName));
      }

      return {
        parent: compactTask(parent, subjName),
        created,
        count: created.length,
      };
    }
    case "estimate_duration": {
      const taskId = asNumber(args.taskId);
      const minutes = asNumber(args.minutes);
      if (taskId === undefined || minutes === undefined) {
        return { error: "taskId and minutes are required" };
      }
      const reasoning = asString(args.reasoning);
      if (reasoning) console.log(`[planner] estimate_duration task ${taskId}: ${minutes}m — ${reasoning}`);
      const updated = await updateTask(taskId, { estimatedMinutes: minutes });
      if (!updated) return { error: `task ${taskId} not found` };
      const subj = await getSubject(updated.subjectId);
      return compactTask(updated, subj?.name ?? "Unknown");
    }
    case "propose_reschedule": {
      const raw = Array.isArray(args.proposals) ? args.proposals : [];
      if (raw.length === 0) return { error: "proposals array is required" };

      const applied: Array<ReturnType<typeof compactTask>> = [];
      const failed: Array<{ taskId: number; reason: string }> = [];

      for (const p of raw) {
        if (!p || typeof p !== "object") continue;
        const proposal = p as ToolArgs;
        const taskId = asNumber(proposal.taskId);
        const newDue = parseDate(proposal.newDueDate);
        if (taskId === undefined) {
          failed.push({ taskId: -1, reason: "missing taskId" });
          continue;
        }
        if (!newDue) {
          failed.push({ taskId, reason: "invalid newDueDate" });
          continue;
        }
        const updated = await updateTask(taskId, { dueDate: newDue });
        if (!updated) {
          failed.push({ taskId, reason: "task not found" });
          continue;
        }
        const subj = await getSubject(updated.subjectId);
        applied.push(compactTask(updated, subj?.name ?? "Unknown"));
      }

      return { applied, failed, appliedCount: applied.length };
    }
    default:
      return { error: `unknown tool: ${name}` };
  }
}

export interface PlannerReply {
  visibleText: string;
}

const MAX_TOOL_ITERATIONS = 6;

const TASK_CAP = 60;
const EVENT_PAST_DAYS = 7;
const EVENT_FUTURE_DAYS = 120;
const RECENT_DONE_CAP = 10;
const TOPICS_PREVIEW = 12;

function safeJsonArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function formatLiveContext(): Promise<string> {
  try {
    const [
      subjects,
      allTasks,
      allEvents,
      profile,
      syllabi,
      activity,
      streak,
    ] = await Promise.all([
      listSubjects(),
      listTasks(),
      listEvents(),
      getProfile(),
      listSyllabi(),
      getTodayActivity(),
      currentStreakDays(),
    ]);

    const now = new Date();
    const lines: string[] = ["LIVE USER STATE (snapshot at start of turn):"];

    // --- Profile + session ---
    if (profile) {
      lines.push(
        `- Profile: ${profile.educationLevel} student, ${profile.studyHoursPerWeek} hrs/week target`,
      );
    } else {
      lines.push("- Profile: not yet set (user hasn't completed onboarding)");
    }
    lines.push(
      `- Today: streak ${streak} day(s), ${activity.sessionsCompleted} session(s) completed, ${activity.breaksUsed} break(s) used`,
    );
    if (isSessionActive()) {
      lines.push(
        `- Active study session: ${sessionElapsedMinutes()}m in, current subject "${getCurrentSubject()}"`,
      );
    } else {
      lines.push("- Active study session: none");
    }

    // --- Subjects + per-subject syllabus summary ---
    const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
    const syllabusBySubject = new Map(syllabi.map((s) => [s.subjectId, s]));

    if (subjects.length === 0) {
      lines.push("- Subjects: none");
      lines.push(
        "  → The user has NO subjects yet. Suggest they add one (use create_task with a new subjectName to auto-create the subject), or finish onboarding.",
      );
    } else {
      lines.push(`- Subjects (${subjects.length}):`);
      for (const s of subjects) {
        const fam = s.familiarity ? ` [familiarity: ${s.familiarity}]` : "";
        lines.push(`  - "${s.name}"${fam}`);
        const syl = syllabusBySubject.get(s.id);
        if (syl) {
          if (syl.difficulty) {
            lines.push(`      difficulty: ${syl.difficulty}`);
          }
          const grading = safeJsonArray(syl.gradingBreakdown);
          if (grading.length > 0) {
            const pretty = grading
              .map((g) => {
                const obj = g as { component?: unknown; weightPercent?: unknown };
                return `${obj.component ?? "?"} ${obj.weightPercent ?? "?"}%`;
              })
              .join(", ");
            lines.push(`      grading: ${pretty}`);
          }
          const topics = safeJsonArray(syl.topics) as string[];
          if (topics.length > 0) {
            const head = topics.slice(0, TOPICS_PREVIEW).join("; ");
            const more =
              topics.length > TOPICS_PREVIEW
                ? ` (+${topics.length - TOPICS_PREVIEW} more)`
                : "";
            lines.push(`      topics: ${head}${more}`);
          }
        }
      }
    }

    // --- Tasks: open (all, capped), then recent done ---
    const open = allTasks.filter((t) => t.status !== "done");
    const doneTasks = allTasks
      .filter((t) => t.status === "done")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    lines.push(`- Tasks: ${open.length} open, ${doneTasks.length} done`);

    if (open.length > 0) {
      const sorted = open
        .slice()
        .sort((a, b) => {
          const ad = a.dueDate ? a.dueDate.getTime() : Infinity;
          const bd = b.dueDate ? b.dueDate.getTime() : Infinity;
          return ad - bd;
        })
        .slice(0, TASK_CAP);
      lines.push(`  Open tasks (showing ${sorted.length}/${open.length}):`);
      for (const t of sorted) {
        const subj = subjectMap.get(t.subjectId) ?? "?";
        const due = t.dueDate
          ? t.dueDate.toISOString().slice(0, 16)
          : "no date";
        const est = t.estimatedMinutes ? `, ~${t.estimatedMinutes}m` : "";
        const parent = t.parentTaskId ? `, parent ${t.parentTaskId}` : "";
        const status = t.status === "todo" ? "" : `, ${t.status}`;
        lines.push(
          `    - [id ${t.id}] "${t.title}" — ${subj}, due ${due}${est}${parent}${status}`,
        );
      }
      if (open.length > TASK_CAP) {
        lines.push(`    …and ${open.length - TASK_CAP} more not shown — use list_tasks to drill in.`);
      }
    }

    if (doneTasks.length > 0) {
      const recent = doneTasks.slice(0, RECENT_DONE_CAP);
      lines.push(`  Recently completed (${recent.length}/${doneTasks.length}):`);
      for (const t of recent) {
        const subj = subjectMap.get(t.subjectId) ?? "?";
        const due = t.dueDate
          ? t.dueDate.toISOString().slice(0, 10)
          : "no date";
        lines.push(`    - [id ${t.id}] "${t.title}" — ${subj}, was due ${due}`);
      }
    }

    // --- Calendar: past 7d + future 120d ---
    const pastCutoff = new Date(now.getTime() - EVENT_PAST_DAYS * 24 * 3600 * 1000);
    const futureCutoff = new Date(
      now.getTime() + EVENT_FUTURE_DAYS * 24 * 3600 * 1000,
    );
    const relevantEvents = allEvents
      .filter((e) => e.startsAt >= pastCutoff && e.startsAt <= futureCutoff)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    if (relevantEvents.length === 0) {
      lines.push(
        `- Calendar (events past ${EVENT_PAST_DAYS}d → next ${EVENT_FUTURE_DAYS}d): none`,
      );
    } else {
      lines.push(
        `- Calendar (events past ${EVENT_PAST_DAYS}d → next ${EVENT_FUTURE_DAYS}d, ${relevantEvents.length} total):`,
      );
      for (const e of relevantEvents) {
        const subj = subjectMap.get(e.subjectId) ?? "?";
        const when = e.startsAt.toISOString().slice(0, 16);
        const tense = e.startsAt < now ? " [past]" : "";
        lines.push(
          `  - [id ${e.id}] "${e.title}" (${e.type}) — ${subj}, ${when}${tense}`,
        );
      }
      const outside = allEvents.length - relevantEvents.length;
      if (outside > 0) {
        lines.push(
          `  …and ${outside} event(s) outside this window — use list_events to retrieve.`,
        );
      }
    }

    return lines.join("\n");
  } catch (err) {
    console.warn("[planner] failed to fetch live context:", err);
    return "LIVE USER STATE: unavailable (database error). Proceed using tools.";
  }
}

export async function sendToPlanner(
  history: ChatMessage[],
  userMessage: string,
): Promise<PlannerReply> {
  const today = new Date().toISOString();
  const contextBlock = await formatLiveContext();
  console.log(`[planner] context:\n${contextBlock}`);
  const systemInstruction = `${studyPlannerAgent.instructions}\n\n${contextBlock}\n\nCurrent date/time (ISO): ${today}`;

  console.log(`[planner] → user: ${userMessage.slice(0, 100)}`);
  console.log(`[planner] history length: ${history.length}`);

  const model = getClient().getGenerativeModel({
    model: modelFor("planner"),
    systemInstruction,
    tools: [{ functionDeclarations: tools }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
  });

  const chat = model.startChat({
    history: history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
  });

  const SEND_OPTS = { timeout: 30_000 };

  console.log(`[planner] sending first message…`);
  let response = await chat.sendMessage(userMessage, SEND_OPTS);
  console.log(`[planner] first response received`);

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const calls = response.response.functionCalls();
    if (!calls || calls.length === 0) {
      console.log(`[planner] no more tool calls after iteration ${i}`);
      break;
    }
    console.log(
      `[planner] iter ${i}: ${calls.length} tool call(s) → ${calls.map((c) => c.name).join(", ")}`,
    );

    const responses = [] as Array<{
      functionResponse: { name: string; response: Record<string, unknown> };
    }>;
    for (const call of calls) {
      try {
        const result = await runTool(call.name, (call.args ?? {}) as ToolArgs);
        console.log(
          `[planner] tool ${call.name} →`,
          JSON.stringify(result).slice(0, 200),
        );
        responses.push({
          functionResponse: {
            name: call.name,
            response: { result },
          },
        });
      } catch (toolErr) {
        console.error(`[planner] tool ${call.name} threw:`, toolErr);
        responses.push({
          functionResponse: {
            name: call.name,
            response: {
              result: {
                error:
                  toolErr instanceof Error ? toolErr.message : String(toolErr),
              },
            },
          },
        });
      }
    }
    console.log(`[planner] sending tool responses…`);
    response = await chat.sendMessage(responses, SEND_OPTS);
    console.log(`[planner] tool response received`);
  }

  const text = response.response.text();
  console.log(`[planner] ← model: ${text.slice(0, 200)}`);

  if (!text.trim()) {
    const candidate = response.response.candidates?.[0];
    const finishReason = candidate?.finishReason ?? "UNKNOWN";
    const safetyRatings = candidate?.safetyRatings ?? [];
    const parts = candidate?.content?.parts ?? [];
    console.warn(
      `[planner] empty text response. finishReason=${finishReason} parts=${JSON.stringify(parts).slice(0, 300)} safety=${JSON.stringify(safetyRatings).slice(0, 200)}`,
    );

    if (finishReason === "SAFETY" || finishReason === "RECITATION") {
      return {
        visibleText: `Gemini blocked the response (${finishReason}). Try rephrasing.`,
      };
    }
    if (finishReason === "MAX_TOKENS") {
      return {
        visibleText: `Gemini ran out of tokens before finishing. Try a shorter request.`,
      };
    }
    return {
      visibleText: `Gemini returned an empty response (finishReason: ${finishReason}). Check the Electron main-process console for full details.`,
    };
  }

  return { visibleText: text.trim() };
}
