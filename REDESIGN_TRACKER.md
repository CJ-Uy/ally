# Redesign Tracker

Tracks all pages/views in main branch and whether they are wired to real backend functionality.

## Status Key
- ✅ Wired — real API calls, reads/writes to SQLite
- 🎨 Designed — UI complete, static/mock data
- 🚧 Partial — some API calls wired, some mock data remains

---

## App Shell

| Area | Status | Notes |
|------|--------|-------|
| Bootstrap / profile check | ✅ Wired | `schemaBootstrap()` + `profileGet()` on startup |
| Loading state | ✅ Wired | Shows animated "A" mark while initialising |
| Onboarding gate | ✅ Wired | Shows `<Onboarding>` if no profile |
| Sidebar task list | ✅ Wired | `useTodayTasks()` from Zustand store |
| Sidebar upcoming event | ✅ Wired | `useUpcomingEvents()` from Zustand store |
| Session state in sidebar | ✅ Wired | `sessionGetState` + `onStateUpdate` IPC |

---

## Full-Screen Flows

| Page | Status | Notes |
|------|--------|-------|
| Onboarding (9 steps) | ✅ Wired | Syllabus PDF pick, Gemini parse, profile save, pre-test |
| Pre-test / familiarity quiz | ✅ Wired | `preTestGenerate`, `preTestSubmit` |
| Session End | 🎨 Designed | Static — wire to `activityToday()` for stats |
| Add Semester (5-step wizard) | 🎨 Designed | Static — needs `subjectsCreate`, `eventsCreate` API calls |

---

## Main Navigation Pages

| Page | Status | Notes |
|------|--------|-------|
| Dashboard (Today) | 🚧 Partial | Session timer is wired; tasks/stats are static |
| Calendar | 🎨 Designed | Static mock events — wire to `eventsList()` |
| Subjects | ✅ Wired | `useSubjects()` store hook, delete via `subjectsDelete()` |
| Subject Detail | ✅ Wired | `tasksListForSubject()`, toggle task status via `tasksUpdate()` |
| Add Subject | 🎨 Designed | Static form — wire to `subjectsCreate()` |
| Settings | 🚧 Partial | Notification toggles are static — wire to `profileUpdateNotifications()` |

---

## Overlay Windows

| Window | Status | Notes |
|--------|--------|-------|
| Lock screen | ✅ Wired | `chatSend`, `lockClose`, `onLockOpen`, `chatSend` for break grant |
| Orb overlay | ✅ Wired | `sessionGetState`, `onStateUpdate`, `sessionStart/Stop` |

---

## Backend (Electron Main Process)

| Module | Status | Notes |
|--------|--------|-------|
| SQLite via libsql | ✅ Present | `electron/db.ts` with Drizzle ORM |
| Schema / migrations | ✅ Present | `electron/data/bootstrap.ts` |
| Subjects CRUD | ✅ Present | `electron/data/subjects.ts` |
| Tasks CRUD | ✅ Present | `electron/data/tasks.ts` |
| Events CRUD | ✅ Present | `electron/data/events.ts` |
| User profile | ✅ Present | `electron/data/profile.ts` |
| Activity tracking | ✅ Present | `electron/data/activity.ts` |
| Syllabus parsing | ✅ Present | `electron/agent/syllabusParser.ts` (Gemini) |
| Study planner AI | ✅ Present | `electron/agent/studyPlanner.ts` (Gemini) |
| Pre-test AI | ✅ Present | `electron/agent/preTest.ts` (Gemini) |
| Session timer | ✅ Present | `electron/session.ts` |
| OS notifications | ✅ Present | `electron/notifications.ts` |
| Productivity IPC | ✅ Present | `electron/ipc/productivity.ts` |
| Window management | ✅ Present | `electron/windows.ts` |

---

## Remaining Work

Priority tasks to fully connect the UI:

1. **Calendar page** — replace mock `CAL_EVENTS` with real `eventsList()` grouped by date
2. **Dashboard stats** — wire streak/session count to `activityToday()`
3. **Add Subject page** — connect form to `subjectsCreate()` + optional syllabus upload
4. **Session End page** — show real `activityToday()` stats
5. **Settings notifications tab** — read from `profileGet()`, save via `profileUpdateNotifications()`
6. **Add Semester wizard** — wire subject/event creation steps to real API calls

---

*Last updated: 2026-05-23*
