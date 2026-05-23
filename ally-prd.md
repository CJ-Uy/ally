# PRD: Study Productivity App

## Overview

A desktop study companion that helps the user plan, track, and stay focused on their academic work. The user uploads syllabi, the app extracts deadlines and tasks, builds a calendar and task list, and helps the user execute by blocking distractions and adjusting plans as life happens.

Built for the KPMG Academic Innovation Challenge 2026 (AI agents track). The locking + AI negotiation orb is already implemented and is the "execution" half of the app. This PRD covers the **planning + AI assistance half** — onboarding, syllabus parsing, calendar, tasks, and the AI agent layer that ties it all together.

## Implementation Status (as of latest commit)

| Scope | Status | Notes |
|-------|--------|-------|
| Scope 0 (orb + lock + negotiation) | ✅ Pre-existing | Untouched. Still uses `mock-context.json`. |
| Scope 1 (Onboarding + Syllabus Parsing) | ✅ Done | Multi-step wizard, Gemini multimodal PDF parser, auto-creates tasks & events. |
| Scope 2 (Calendar + Tasks + Planner Chat) | ✅ Done | Month/week calendar, per-subject task lists, Study Planner agent with 11 Gemini function-calling tools. |
| Scope 3 (Smart AI Behaviors) | ✅ Done | 5 new planner tools (`suggest_next_task`, `check_at_risk`, `breakdown_task`, `estimate_duration`, `propose_reschedule`). At-risk items surfaced proactively in Today view with "Break down"/"Reschedule" CTAs that prefill the planner. |
| Scope 4 (Wire real context into orb negotiation) | ⬜ Not started | Replace `mock-context.json` consumer with live Turso query. |
| Scope 5 (Pre-test, persistence, notifications) | ⬜ Stretch, not started | — |

### Where the new code lives

**Schema & data layer** (single source of truth: `electron/data/bootstrap.ts` raw DDL + `src/lib/schema.ts` Drizzle types — both must be edited together when changing the schema):
- `src/lib/schema.ts` — Drizzle table definitions (`user_profile`, `subjects`, `syllabi`, `tasks`, `events`).
- `electron/data/bootstrap.ts` — `CREATE TABLE IF NOT EXISTS` runs on Electron app start; logs `tables present: …` to the main-process console.
- `electron/data/{profile,subjects,syllabi,tasks,events}.ts` — DAL functions.

**Agents** (all mirror the Copilot Studio shape — `name`, `description`, `instructions`, `knowledge`, `triggers` — see existing `electron/agent/config.ts` as the canonical template):
- `electron/agent/syllabusParser.ts` — Gemini multimodal PDF parser. Returns structured deadlines, exams, grading breakdown, topics, difficulty.
- `electron/agent/studyPlanner.ts` — Conversational planner with function-calling tools (`list_subjects`, `list_tasks`, `list_events`, `create_task`, `update_task`, `mark_task_done`, `delete_task`, `create_event`, `update_event`, `delete_event`, `get_user_context`). Includes 30s per-call SDK timeout and 60s outer timeout. Verbose logging on every Gemini round-trip.
- `electron/agent/{config,context,gemini}.ts` — Study Guardian (negotiation) agent. Pre-existing. **Do not refactor without a reason — Scope 4 will edit `context.ts` to read from Turso.**

**IPC**:
- `electron/ipc/productivity.ts` — All new IPC handlers (profile, subjects, syllabus parse, tasks, events, planner chat). Registered in `electron/main.ts` via `registerProductivityIpc()` after `app.whenReady`.
- `electron/preload.ts` — Bridge methods. Renderer-side types in `electron/electron-env.d.ts`.

**Renderer**:
- `src/App.tsx` — Routes between `<Onboarding>` (no profile) and `<Dashboard>` (profile saved) after `schemaBootstrap`. Aesthetic is editorial/paper (Fraunces + Geist, warm terracotta on cream — see `src/index.css` for tokens).
- `src/onboarding/Onboarding.tsx` — 7-step wizard: intro → hours → level → subjects → uploads → parsing → review → done.
- `src/dashboard/Dashboard.tsx` — Sidebar shell with Today/Calendar/Tasks/Plan nav, **diagnostic panel showing live subject/task/event counts + manual refresh button + visible error strip**, subject swatches, session panel.
- `src/dashboard/{TodayView,CalendarView,TasksView,PlannerChat}.tsx` — Views.
- `src/data/store.ts` — `useProfile/useSubjects/useTasks/useEvents/useTodayTasks/useUpcomingEvents` hooks + `dataBus` + `refreshAll()`. Hooks return `[value, reload, { value, reload, loading, error }]`. **Uses a `loaderRef` to keep `reload` stable across renders — do not re-introduce the bug where `loader` was a useCallback dep.**

**Scripts**:
- `scripts/reset-db.mjs` — Drops all five tables in Turso. Run via `pnpm reset` (or `npm run reset`). After running, restart the app and you'll be back at onboarding.

### Conventions to keep

- **Agent shape is non-negotiable.** Every new AI capability gets its own file under `electron/agent/`, exporting a `const someAgent = { name, description, instructions, knowledge, triggers } as const`. Runner functions go below. Never bury Gemini prompts inline in route handlers or components.
- **Schema edits = two files.** `src/lib/schema.ts` AND `electron/data/bootstrap.ts` must stay in sync. There's no drizzle-kit migration tooling — bootstrap-on-start is the workflow.
- **Custom CSS, not Tailwind.** Aesthetic is locked in. Design tokens are in `src/index.css` (`--paper`, `--ink`, `--terra`, etc.). Use them; don't introduce a parallel system.
- **`@google/generative-ai` 0.24.1** is the SDK. `SchemaType` (not `FunctionDeclarationSchemaType`). Function-response shape: `{ functionResponse: { name, response: { result: <anything> } } }`.

### Known gotchas

- The renderer's `useReload` hook intentionally returns a 3-tuple `[value, reload, meta]`. Old callers using `const [x] = ...` still work; new callers can grab `meta.loading`/`meta.error`.
- `mock-context.json` is still the source for the negotiation agent. Don't delete it until Scope 4 lands.
- Turso credentials and `GEMINI_API_KEY` are in `.env` (gitignored). The existing orb code already reads them, so they're known to load correctly via `dotenv/config` at the top of `electron/main.ts`.

## What's Already Built (Scope 0 — Context Only)

- Electron app shell with a floating orb (bottom-right, always-on-top, idle/active states).
- Start/stop study session via orb click.
- Active window polling against a hardcoded blocklist (YouTube, TikTok, etc).
- Fullscreen lock overlay with back-and-forth Gemini chat for break negotiation.
- Mock study context (JSON file) fed to the negotiation agent.
- **Existing agent JS config files** — we already have JS files defining Gemini-powered agents for specific tasks (the negotiation agent being the first one). Each follows a consistent structure that mirrors Copilot Studio: name, description, instructions, knowledge, triggers, plus the Gemini call wiring.

This PRD does NOT rebuild any of that. It extends the app with the productivity layer. The mock context file will eventually be replaced by real data from the features built here (see Scope 4).

### Working with existing agents

Agents are the core deliverable for the hackathon — the KPMG AIC challenge is about building AI agents, so this is how we organize all AI logic in the app.

**Rules for any new feature that needs AI**:
- Read the existing agent JS config files first to understand the established pattern (file structure, how name/description/instructions/knowledge/triggers are defined, how Gemini is called, how responses are parsed).
- New agents follow the same pattern. Don't invent a parallel structure.
- You can freely **add new agents** for new tasks (e.g. a Syllabus Parser agent, Study Planner agent, Smart Scheduler agent).
- You can also freely **update existing agent files** if a feature needs the agent to do more (e.g. when Scope 4 wires real context into the negotiation agent, you may need to edit the negotiation agent's knowledge function).
- Keep the Copilot Studio mirror intact (name, description, instructions, knowledge, triggers should always be clearly defined fields, not buried in code).

## Goals

- Let the user onboard quickly and get a real plan generated from their syllabi.
- Provide a calendar and task list the user can interact with manually AND that an AI agent can fully manipulate.
- Have an AI layer that actively helps: rescheduling, suggesting what to work on next, breaking down big tasks, estimating durations, flagging at-risk deadlines.
- Wire the real plan into the existing lock/negotiation flow so break decisions are grounded in actual context.
- Stay aligned with Copilot Studio agent structure (name, description, instructions, knowledge, triggers) for challenge requirements.

## Tech Direction (Non-Prescriptive)

- The app is Electron. Pick the renderer stack that's easiest to vibe code (React + Tailwind is a reasonable default but not required).
- **Persistence: Turso database** (already in use for the project). All productivity data lives there.
- **AI**: Gemini API for most tasks. Use whichever Gemini model fits the task (e.g. a faster model for chat, a multimodal one for PDF parsing). API key already configured.
- **Calendar UI**: build it. Decide whether to roll your own or use an open-source component (e.g. FullCalendar, react-big-calendar) based on whichever is faster to integrate. Either is fine.
- Don't assume anything about the existing orb code beyond the contract described in Scope 4. Read the code before touching it.

---

# Scopes

Each scope is a shippable chunk. Finish one, verify it works, then move to the next.

---

## Scope 1: Onboarding + Syllabus Parsing

Get the user from zero to "the app knows my semester."

### Onboarding flow

A first-launch flow that collects:
- **Study hours per week** (number input, e.g. 15).
- **Educational level** (high school / college).
- **Subject list** — user names their current subjects.
- **Syllabus upload** — one PDF per subject, batch upload supported. User can also skip individual subjects if no syllabus available.

After collection: the app shows a confirmation screen ("Here are the subjects I'll track: ..."). User confirms or edits.

Subjects without syllabi just get created as empty folders with the subject name.

### Syllabus parsing

For each uploaded PDF:
- Send to Gemini (use a multimodal model that accepts PDFs directly, e.g. `gemini-2.5-flash` or `gemini-2.5-pro`).
- Extract:
  - **Deadlines** (assignment due dates, project deadlines)
  - **Exam dates**
  - **Grading breakdown** (percentages: exams %, assignments %, projects %, etc)
  - **Major topics covered** (high-level outline)
  - **Overall difficulty estimate** (the AI's read of how heavy this course is)
- Store all of this in Turso, linked to the subject.
- Auto-generate tasks for each deadline (e.g. "Submit Assignment 1" → task with that due date).
- Auto-generate events on the calendar for exams.

### Data model (suggested, AI can refine)

- `subjects`: id, name, education_level, created_at
- `syllabi`: id, subject_id, file_path (or blob), parsed_at, grading_breakdown (JSON), difficulty (string), topics (JSON)
- `tasks`: id, subject_id, title, description, due_date, estimated_minutes, status (todo/in_progress/done), parent_task_id (for subtasks), created_by (user/ai), created_at
- `events`: id, subject_id, title, type (exam/class/deadline), starts_at, ends_at, created_at
- `user_profile`: id, study_hours_per_week, education_level, onboarded_at

### Success criteria

- User completes onboarding in under 5 minutes for 3-4 subjects.
- After upload, the app shows extracted deadlines and exams per subject for user confirmation before saving.
- Tasks and calendar events appear in Turso, linked correctly to subjects.

---

## Scope 2: Calendar + Task UI with AI Agent (Full Read/Write)

Build the UI for the user to see and interact with their plan, AND give the AI agent tools to manipulate it from day one.

### Calendar UI

- Month view by default, with week view as a toggle.
- Shows all events (exams, deadlines, classes) and all tasks with due dates.
- Click an event/task to see details and edit.
- Color-coded by subject.
- Today highlighted.

### Task list UI

- Grouped by subject, with collapse/expand per subject.
- Each task shows title, due date, estimated duration, status.
- User can:
  - Check off tasks (mark done)
  - Edit task title, due date, duration
  - Delete tasks
  - Manually add new tasks
  - Expand a task to see its subtasks
- A "Today" view that surfaces what's due/scheduled today across all subjects.

### AI Agent (Planning Assistant)

A chat interface accessible from the main app window (separate from the lock/negotiation chat). The user can ask things like:
- "Add a study session for Linear Algebra tomorrow at 3pm"
- "What should I work on next?"
- "Mark the calculus homework as done"
- "Move my history reading to Saturday"

The agent has **tools** (function calling) to:
- `create_task(subject, title, due_date, estimated_minutes, parent_task_id?)`
- `update_task(task_id, fields)`
- `mark_task_done(task_id)`
- `delete_task(task_id)`
- `create_event(subject, title, type, starts_at, ends_at)`
- `update_event(event_id, fields)`
- `list_tasks(filters?)`
- `list_events(filters?)`
- `get_user_context()` — returns user profile + current state summary

Use Gemini's function calling capability for this.

### Agent config (Copilot Studio mirror)

**Name**: Study Planner

**Description**: An AI agent that helps the user manage their study plan — creating, updating, and organizing tasks and calendar events through conversation.

**Instructions**:
- Be conversational and concise. Confirm actions briefly before executing destructive ones (delete, bulk update).
- When the user asks for suggestions, ground them in actual data (deadlines, current load, recent activity).
- Always verify task/event IDs before modifying — use `list_tasks` or `list_events` first if unsure.
- Use the user's own subject names when referring to tasks.

**Knowledge**: live data from Turso (queried via tools, not preloaded).

**Triggers**: user opens the chat or sends a message.

### Success criteria

- User can fully manage tasks/calendar via the UI alone.
- User can also do everything via chat (add, edit, delete, query).
- Manual edits and AI edits stay in sync (both write to Turso, both reflect in UI immediately).
- The agent doesn't hallucinate task IDs or invent data.

---

## Scope 3: Smart AI Behaviors

Now that the agent can read/write the plan, make it actually smart. These are proactive or context-aware behaviors layered on top of Scope 2.

### Features

- **Auto-reschedule when behind**: if the user has overdue tasks or is falling behind a deadline, the agent suggests a new schedule (and can apply it with confirmation).
- **Suggest next task**: "What should I work on?" → agent considers deadlines, estimated duration, current energy/time available, and recent activity to recommend one task with reasoning.
- **Subtask breakdown**: for any task the user flags as too big (or that the agent detects as oversized via estimated_minutes), the agent breaks it into smaller subtasks with their own due dates and durations.
- **Duration estimation**: when tasks are created without an estimate, the agent estimates based on subject difficulty, task type, and the user's historical pace (or sensible defaults if no history).
- **At-risk deadline flagging**: scan upcoming deadlines daily (or on app open) and flag any where the remaining time is less than the total estimated work. Surface these in a "needs attention" section.

### How they trigger

- **On-demand**: user asks via chat ("what's at risk?", "break this down for me").
- **Proactive**: a daily check (or on app open) that surfaces at-risk items and overdue tasks as notifications/banners in the UI. User can dismiss or act.

### Agent updates

Extend the Scope 2 agent with:
- New tools: `suggest_next_task()`, `breakdown_task(task_id)`, `estimate_duration(task_id)`, `check_at_risk()`, `propose_reschedule(task_ids?)`.
- Instructions updated to use these tools when appropriate.

### Success criteria

- Asking "what should I work on?" returns a single concrete task with one-sentence reasoning.
- Asking to break down a big task produces 3-6 subtasks with reasonable durations and staggered due dates.
- The at-risk check correctly flags tasks where time-left < estimated-work.
- Reschedule suggestions don't double-book the user.

---

## Scope 4: Wire Real Context into the Lock Negotiation

Replace the mock context file used by the existing orb's negotiation agent with real data from Turso.

### What changes

- The existing `mock-context.json` consumer in the orb code is swapped for a function that builds the same shape from live Turso data.
- Shape stays the same (so the existing negotiation prompt doesn't need rewriting):
  ```
  {
    studySession: { active, startedAt, elapsedMinutes, currentSubject },
    todayTasks: [...],
    calendar: [...],
    streaks: { currentDays, breaksUsedToday },
    userProfile: { studyHoursPerWeek, educationLevel }
  }
  ```
- `currentSubject` is inferred from the active study session (user can set it when starting a session, or default to "general").
- `todayTasks` queries tasks where due_date is today or overdue.
- `calendar` queries upcoming events in the next 7 days.
- `streaks` and `breaksUsedToday` start as live counters (see Scope 5 for persistence).

### Touch points

- Find where the orb reads `mock-context.json`.
- Replace that read with a function call that returns the same shape from Turso queries.
- Don't change the negotiation prompt or the agent config in the orb.

### Success criteria

- Triggering a lock and negotiating now references the user's actual current subject, real tasks, real upcoming exams.
- The negotiation agent's reasoning becomes meaningfully better (e.g. "you have a midterm in 2 days and 3 untouched tasks, no break").

---

## Scope 5 (Stretch): Pre-Test, Persistence, Notifications

If there's time.

### Pre-test

- After syllabus parsing in Scope 1, generate a light familiarity check per subject.
- NOT a formal test. Casual check-in questions: "Have you seen a matrix before?" "Do you know what photosynthesis is?"
- 3-5 questions per subject, multiple choice or short answer.
- Results stored as `subject_familiarity` (beginner/familiar/confident) per subject.
- Used by the planning agent to calibrate task duration estimates and reschedule aggressiveness.

### Streak persistence

- Track daily streak (days with at least one completed study session).
- Track breaks used per day (resets at midnight local time).
- Both feed into the lock negotiation context.

### Notifications

- Native OS notifications via Electron's notification API.
- Triggers:
  - At-risk deadline flagged
  - Task due today reminder (morning)
  - Streak in danger ("you haven't started a session today")
- User can toggle each category in settings.

---

# Future Considerations (Beyond v1)

- **Phone app companion** for blocking mobile distractions during sessions (PWA + native combo as originally planned).
- **External calendar sync** (Google Calendar, Outlook) for bi-directional event sync.
- **AI-driven blocklist** instead of hardcoded keywords (infer distraction based on context and current subject).
- **Multi-device sync** via Turso (already DB-backed, just needs auth).
- **Collaborative features**: shared study groups, accountability partners.
- **Voice input** for the chat agents.
- **Historical analytics**: study time per subject, completion rates, what time of day you're most productive.
- **Real Copilot Studio deployment** as the agent runtime once licensing is sorted.

---

# Out of Scope (Entire PRD)

- Anything not related to academic study planning.
- User accounts, auth, multi-user support.
- Cloud sync beyond what Turso provides natively.
- Mobile app development (mock or future only).
- Browser extension companion.

---

# Open Questions

- Default reminder times for "due today" notifications — morning fixed time, or learned from user behavior?
- When the planning agent reschedules tasks, does it move events too, or only tasks? (Suggested: only tasks, events like exams are fixed.)
- Should completed tasks stay visible in the task list (greyed out) or hide by default with a toggle?
- For batch syllabus upload: parse them in parallel (faster, more API calls at once) or sequentially (slower, safer for rate limits)?