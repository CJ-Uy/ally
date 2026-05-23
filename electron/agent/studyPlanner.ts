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

export const studyPlannerAgent = {
  name: "Study Planner",
  description:
    "An AI agent that helps the user manage their study plan — creating, updating, and organizing tasks and calendar events through conversation.",
  instructions: `You are Study Planner, the user's study assistant. You manage their academic tasks and calendar.

CRITICAL: ALWAYS reply with a visible message to the user. Never return an empty response. If you do nothing else, at least acknowledge the user's message in one sentence.

Tone: warm, concise, and direct. No filler. Confirm destructive actions (delete, bulk update) in one short sentence before executing.

A LIVE USER STATE snapshot is provided in the system context at the start of every turn — use it as your primary source of truth. You do NOT need to call list_subjects / list_tasks / list_events for read-only queries; the answer is already in the context. Only call tools when you need to mutate state (create, update, delete, mark done) or when the user explicitly asks for fresh data.

If the snapshot says "Subjects: none": the user has no subjects yet. Tell them so and offer to create one directly (call create_task with a new subjectName — the system will auto-create the subject) or suggest they add a syllabus.

If subjects exist but tasks are empty: tell the user and offer to add one.

When the user asks "what should I work on next?": use the snapshot's open task list. Recommend ONE concrete task by id, considering deadlines (closer = higher priority) and workload (estimated_minutes), with a one-sentence reason. If there are no open tasks, say so.

When creating tasks or events:
- Use subject names exactly as shown in the snapshot when referring to existing subjects. Use a new name to create a new subject.
- If the user gives a relative date ("tomorrow", "next Friday"), resolve it to a calendar date using the current date in the system context.
- If estimated_minutes is missing for a new task, pick a sensible default based on task type (homework ≈ 45, reading ≈ 30, project chunk ≈ 90).

After a successful tool call, confirm what you did in one short sentence ("Added 'Read chapter 4' to Calculus, due Friday."). Do not dump JSON at the user.

If a tool call fails, tell the user what went wrong in plain English. Don't retry the same call without changing inputs.`,
  knowledge: {
    note: "Live data is queried via tools (list_subjects, list_tasks, list_events). No preloaded knowledge.",
  },
  triggers: ["on_planner_chat_message"],
} as const;

const PLANNER_MODEL = "gemini-2.5-flash";

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
    default:
      return { error: `unknown tool: ${name}` };
  }
}

export interface PlannerReply {
  visibleText: string;
}

const MAX_TOOL_ITERATIONS = 6;

async function formatLiveContext(): Promise<string> {
  try {
    const [subjects, allTasks, allEvents, profile] = await Promise.all([
      listSubjects(),
      listTasks(),
      listEvents(),
      getProfile(),
    ]);

    const lines: string[] = ["LIVE USER STATE (snapshot at start of turn):"];

    if (profile) {
      lines.push(
        `- Profile: ${profile.educationLevel} student, ${profile.studyHoursPerWeek} hrs/week target`,
      );
    } else {
      lines.push("- Profile: not yet set (user hasn't completed onboarding)");
    }

    if (subjects.length === 0) {
      lines.push("- Subjects: none");
      lines.push(
        "  → The user has NO subjects yet. Suggest they add one (use create_task with a new subjectName to auto-create the subject), or finish onboarding.",
      );
    } else {
      lines.push(
        `- Subjects (${subjects.length}): ${subjects.map((s) => `"${s.name}"`).join(", ")}`,
      );
    }

    const open = allTasks.filter((t) => t.status !== "done");
    const done = allTasks.length - open.length;
    lines.push(`- Tasks: ${open.length} open, ${done} done`);

    if (open.length > 0) {
      const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
      const sorted = open
        .slice()
        .sort((a, b) => {
          const ad = a.dueDate ? a.dueDate.getTime() : Infinity;
          const bd = b.dueDate ? b.dueDate.getTime() : Infinity;
          return ad - bd;
        })
        .slice(0, 10);
      for (const t of sorted) {
        const subj = subjectMap.get(t.subjectId) ?? "?";
        const due = t.dueDate
          ? t.dueDate.toISOString().slice(0, 10)
          : "no date";
        const est = t.estimatedMinutes ? `, ~${t.estimatedMinutes}m` : "";
        lines.push(`  - [id ${t.id}] "${t.title}" — ${subj}, due ${due}${est}`);
      }
      if (open.length > 10) lines.push(`  …and ${open.length - 10} more`);
    }

    const upcomingEvents = allEvents
      .filter((e) => e.startsAt >= new Date())
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .slice(0, 5);
    if (upcomingEvents.length > 0) {
      const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
      lines.push(`- Upcoming events (${upcomingEvents.length}):`);
      for (const e of upcomingEvents) {
        const subj = subjectMap.get(e.subjectId) ?? "?";
        lines.push(
          `  - [id ${e.id}] "${e.title}" (${e.type}) — ${subj}, ${e.startsAt.toISOString().slice(0, 16)}`,
        );
      }
    } else {
      lines.push("- Upcoming events: none");
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
    model: PLANNER_MODEL,
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
