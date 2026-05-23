# Redesign Tracker

Tracks every page/area in `feat/implementation` against the Study Blue design system.
Status is based on CSS integration pass applied 2026-05-23.

**Legend**
- ✅ Done — CSS updated to Study Blue tokens, no rework needed
- 🔲 Needs review — functional but may benefit from polish pass
- ⚠️ Gap — functionality exists, no matching design spec; custom design applied

---

## App Shell

| Area | File(s) | Status | Notes |
|------|---------|--------|-------|
| Loading screen | `src/App.tsx`, `src/App.css` | ✅ Done | Fox-orange pulse → accent-blue pulse |
| Root layout / route | `src/App.tsx` | ✅ Done | Minimal shell, no dedicated styling needed |

---

## Onboarding Flow

Multi-step wizard (`src/onboarding/Onboarding.tsx`)

| Step | Status | Notes |
|------|--------|-------|
| Intro — welcome + 3 feature cards | ✅ Done | |
| Step 1 — Study hours (range slider) | ✅ Done | Slider thumb updated to `--accent` |
| Step 2 — Education level (2 cards) | ✅ Done | Active state now `--sky` |
| Step 3 — Subject names (inputs) | ✅ Done | |
| Step 4 — Syllabus PDF uploads | ✅ Done | |
| Parsing — progress list | ✅ Done | Pulse animation uses `--fox` |
| Review — syllabus parse results | ✅ Done | Difficulty badges use palette chips |
| Pre-test — familiarity check-in | ✅ Done | Handled via `PreTest` component |
| Done — completion screen | ✅ Done | |

---

## Dashboard Shell

| Area | File(s) | Status | Notes |
|------|---------|--------|-------|
| Sidebar / rail | `src/dashboard/Dashboard.css` | ✅ Done | Active nav uses `--sky` bg |
| Brand / logo mark | `src/dashboard/Dashboard.tsx` | 🔲 Needs review | Uses letter "A" mark — could swap to `ally.png` fox image |
| Data diagnostics panel | `src/dashboard/Dashboard.tsx` | ✅ Done | Diagnostic readout in sidebar |
| Subject list (sidebar) | `src/dashboard/Dashboard.tsx` | ✅ Done | Colored dots |
| Session panel (sidebar) | `src/session/SessionPanel.tsx`, `SessionPanel.css` | ✅ Done | State pills use palette colors |

---

## Dashboard Views

### Today View (`src/dashboard/TodayView.tsx`)

| Area | Status | Notes |
|------|--------|-------|
| Header + metrics | ✅ Done | Overdue count in warm orange |
| At-risk tasks banner | ✅ Done | Fox-orange tint border |
| Due-today task list | ✅ Done | Check circles, overdue badge |
| Calendar events (today) | ✅ Done | Event-type chips use palette |
| Upcoming exams | ✅ Done | Date block, relative label |
| Empty states | ✅ Done | |

### Calendar View (`src/dashboard/CalendarView.tsx`)

| Area | Status | Notes |
|------|--------|-------|
| Month grid | ✅ Done | Today cell: fox border |
| Week grid | ✅ Done | |
| Calendar items (exam/class/deadline/task) | ✅ Done | Per-type pastel backgrounds |
| Week/Month mode toggle | ✅ Done | Pill switcher |
| Prev/Next/Today navigation | ✅ Done | Ghost buttons |
| Empty state | ✅ Done | |

### Tasks View (`src/dashboard/TasksView.tsx`)

| Area | Status | Notes |
|------|--------|-------|
| Subject group headers (collapsible) | ✅ Done | Left-border colored by subject |
| Task rows | ✅ Done | Check circle, done strikethrough |
| Inline add task | ✅ Done | Dashed add trigger |
| Inline edit task | ✅ Done | |
| Show/hide completed toggle | ✅ Done | |
| AI-created task badge | ✅ Done | Sky tint chip |
| Empty state | ✅ Done | |

### Plan (Planner Chat) (`src/dashboard/PlannerChat.tsx`)

| Area | Status | Notes |
|------|--------|-------|
| Empty state + prompt starters | ✅ Done | Starters: dashed border hover |
| User message bubble | ✅ Done | `--accent` blue |
| Ally response bubble | ✅ Done | `--bg` tinted panel |
| Typing indicator | ✅ Done | Fox-orange dot bounce |
| Input bar | ✅ Done | |
| "New conversation" reset | ✅ Done | |

### Settings View (`src/dashboard/SettingsView.tsx`)

| Area | Status | Notes |
|------|--------|-------|
| Notification toggles | ✅ Done | Custom switch, accent on |
| Streak stats (3-up grid) | ✅ Done | Paper-texture stat blocks |
| Subject familiarity list | ✅ Done | Familiarity chips: butter/sky/sage |
| Re-assess / take check-in button | ✅ Done | Opens PreTest inline |

---

## PreTest (Familiarity Check-in)

`src/pretest/PreTest.tsx`

| Area | Status | Notes |
|------|--------|-------|
| Question list | ✅ Done | Cards with paper texture |
| Choice buttons | ✅ Done | Selected: sky background + accent border |
| Band labels (beginner/confident) | ✅ Done | Palette chips |
| Loading state | ✅ Done | |
| Error state | ✅ Done | Blush border |
| Result card | ✅ Done | Per-familiarity color chips |
| Skip footer | ✅ Done | |

---

## Lock Screen

`src/lock/Lock.tsx` (separate Electron window)

| Area | Status | Notes |
|------|--------|-------|
| Dark shell (Twilight palette) | ✅ Done | Self-contained CSS vars |
| Header — blocked site message | ✅ Done | Display font title |
| Chat message list | ✅ Done | User: accent blue; agent: panel |
| Typing indicator | ✅ Done | Fox-orange dots |
| Textarea composer | ✅ Done | Focus: accent glow |
| Close button | ✅ Done | |

---

## Orb

`src/orb/Orb.tsx` (frameless overlay window)

| Area | Status | Notes |
|------|--------|-------|
| Idle state | ✅ Done | Ink-soft radial gradient |
| Studying state | ✅ Done | Fox-orange radial + pulse animation |
| Break state | ✅ Done | Sage green radial |
| Countdown timer display | ✅ Done | Tabular mono font |

---

## Areas Not in Design System (Custom Design Applied)

These features exist in `feat/implementation` but have no corresponding screen in the main branch design spec. Custom Study-Blue-consistent styling was applied.

| Feature | Notes |
|---------|-------|
| Dashboard sidebar "Data diagnostics" panel | Real-time DB counters; no design mockup — styled as a mono card |
| At-risk tasks banner (TodayView) | Urgency-tinted card; no design mockup — fox-orange accent applied |
| Inline task add/edit form | No design mockup — uses standard input tokens |
| PreTest inside SettingsView | Re-assessment flow; no dedicated layout — renders full-width within workspace |
| Planner chat history persistence | "New conversation" button; no design mockup — ghost button in header |
| Session elapsed time display | Large tabular display font in sidebar panel |
| Break countdown (Orb) | Sage-green orb with countdown; consistent with break color semantics |

---

## Not Yet Covered / Future Work

| Item | Notes |
|------|-------|
| Brand logo mark in sidebar | Currently uses text "A" — could use `public/ally.png` fox image |
| Dark mode (Twilight) for main app | Only lock screen uses Twilight; main app has no dark toggle wired |
| Mobile / responsive polish | Basic responsive breakpoints exist; phone-size layout untested |
| Transitions between dashboard views | Currently instant swap; could add fade/slide |
| Syllabus upload drag-and-drop zone | Upload step uses file picker only; no drop zone UI |
