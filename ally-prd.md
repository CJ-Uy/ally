# PRD: Study Lock App (v1)

## Overview

A desktop study tool that locks the user out of distracting apps and websites during a study session. To unlock, the user has to negotiate with an AI agent that decides whether a break is warranted based on the user's study context (tasks, schedule, progress, streaks).

The full vision is a broader study companion (syllabus parsing, calendar, todos, pre-tests, etc) but **v1 focuses solely on the locking + negotiation loop**. Study context is mocked from a local file for now.

Built for the KPMG Academic Innovation Challenge 2026, which requires Copilot Studio integration. The plan is to build the agent in code (Gemini API) using a structure that mirrors Copilot Studio (name, description, instructions, knowledge, triggers) so it stays portable. If Copilot Studio deployment fails on a student account, the Copilot Studio version exists as a parallel workflow for the challenge demo, while the actual app runs on the code implementation.

## Goals

- Block distracting apps/sites system-wide while a study session is active
- Let the user negotiate breaks via a back-and-forth chat with an AI agent
- Keep the agent's decisions grounded in real-ish study context (mocked for v1)
- Ship a smooth UX that feels native, not like a hackathon hack
- Stay aligned with Copilot Studio agent structure for challenge requirements

## Non-Goals (v1)

- Phone app (mock or skip entirely)
- Syllabus parsing, pre-tests, calendar sync, todo management
- Persistence across sessions (negotiation history, streaks, break counts)
- Force-closing tabs/apps when block triggers (just show the lock UI)
- Preventing force-quit of Electron itself (known limitation, accepted)

## User Flow

1. User opens the Electron app.
2. User clicks **Start Study Session** (with optional subject/duration input, or just a free-form session).
3. The **orb** appears, floating bottom-right of the screen. Mostly transparent when idle, becomes visible on hover.
4. User works in study apps. Nothing happens. Orb idles.
5. User switches to a distracting app or site (YouTube, TikTok, etc).
6. App detects this via active window title polling.
7. **Lock modal** appears over the orb area (or expanded from it), showing:
    - What's blocked and why
    - A chat interface to negotiate
    - The study session timer (paused during negotiation)
8. User types their case. Agent responds back and forth.
9. Agent either:
    - **Grants a break** (1-20 min, AI discretion based on context)
    - **Denies** and explains why
10. If granted: orb shows a countdown timer. User has free reign for N minutes. Study session timer stays paused.
11. When break timer hits 0: lock re-engages immediately. User is back to step 5 territory if they're still on the distracting app.
12. User clicks **Stop Study Session** when done. Orb disappears.

## Features

### 1. Study Session State

- Manual **Start** / **Stop** controls in the main app window
- Session has: active flag, start time, elapsed time, current break state (active break + countdown if any)
- Session timer pauses during negotiation chat and during granted breaks
- All state in-memory for v1

### 2. Distraction Detection

- Poll the OS for the active window title at a reasonable interval (e.g. every 1-2 seconds)
- Match against a hardcoded blocklist of app names and site keywords (YouTube, TikTok, Twitter/X, Instagram, Reddit, Netflix, Discord, common games, etc)
- When a match is found and a study session is active and no break is currently granted: trigger the lock
- Blocklist lives in a config file at the root of the project so it's easy to edit

### 3. The Orb

- Always-on-top floating window, fixed to bottom-right corner of the primary display
- Very transparent (~20% opacity) when idle
- Opacity ramps up on hover
- Click to open the main app window
- During an active break: shows a clear countdown (e.g. `4:32` remaining)
- Visual state communicates: idle (studying, no issue), negotiating (lock active), on break (countdown)

### 4. Lock + Negotiation UI

- When a block triggers: a modal or expanded panel appears anchored near the orb
- Contains:
    - Clear message: "TikTok is blocked during your study session"
    - Chat interface (back-and-forth, not one-shot)
    - Input field, send button
    - Visual indicator that the session timer is paused
- User can chat freely. Agent responds with grounded reasoning.
- Agent's final decision is structured: either `{granted: true, minutes: N}` or `{granted: false, reason: "..."}`
- On grant: modal closes, orb shows countdown, user gets free reign for N minutes
- On deny: modal stays open, user can keep trying OR close it and go back to studying
- Hard cap: agent cannot grant more than 20 minutes in a single break (enforced in code regardless of what AI says)

### 5. The Agent

Structured to mirror Copilot Studio. The implementation is in code using the Gemini API, but the agent definition is stored as a single config (so a Copilot Studio version can mirror it 1:1).

**Name**: Study Guardian (working title)

**Description**: An AI agent that decides whether to grant the user a break from studying based on their study context, progress, and the case they make.

**Instructions**:
- Default stance: protect the study session. Be skeptical of weak excuses.
- Reward genuine reasoning: ahead of schedule, completed hard tasks, low energy after long stretch, scheduled rest, etc.
- Be conversational and a bit warm, not a robotic gatekeeper. The user should feel heard.
- Ask clarifying questions if the case is vague.
- Grant breaks proportional to the strength of the case and the user's recent activity. Range: 1-20 min.
- Never grant a break exceeding 20 minutes. Never grant a break if no real reasoning is given.
- Output the final decision in a structured format the app can parse.

**Knowledge** (context loaded into every conversation):
- Current study session state (active, elapsed, current task)
- Today's tasks (mocked)
- Today's calendar (mocked)
- Streak / breaks-used-today (mocked as static values for v1)
- User profile: study hours per week, education level (mocked)

**Triggers**: triggered by the app when a distraction is detected and the user clicks "Negotiate" (or whatever the UI calls it). Not autonomous beyond that.

### 6. Mock Context File

A single JSON file the agent reads at the start of every negotiation. Shape:

```json
{
  "studySession": {
    "active": true,
    "startedAt": "ISO timestamp",
    "elapsedMinutes": 0,
    "currentSubject": "Linear Algebra"
  },
  "todayTasks": [
    { "id": "t1", "subject": "Linear Algebra", "title": "Practice problems Ch. 4", "done": false },
    { "id": "t2", "subject": "History", "title": "Read Module 3", "done": true }
  ],
  "calendar": [
    { "title": "Linear Algebra exam", "date": "ISO", "type": "exam" }
  ],
  "streaks": {
    "currentDays": 0,
    "breaksUsedToday": 0
  },
  "userProfile": {
    "studyHoursPerWeek": 20,
    "educationLevel": "college"
  }
}
```

The file lives at the project root and is hot-readable (changes pick up next negotiation). This stays the contract when real implementations slot in later.

## Future Considerations

- **AI-driven blocklist detection** (instead of hardcoded list, infer whether the current app/site is distracting given the user's subject and tasks)
- **Phone app companion** that locks distracting apps on mobile during study sessions. Native receiver only, core logic stays on the web/desktop app.
- **Persistence**: negotiation history, streak counts, breaks-used-today carrying across sessions
- **Force-close tabs/apps** when break ends or when negotiation fails (vs just showing the lock modal)
- **Warning before break ends** (1 min remaining notification)
- **Anti-bypass measures**: prevent force-quit of Electron, system tray persistence, auto-restart
- **Draggable orb position** instead of fixed corner
- **Full study tool features**: syllabus upload + parsing, auto-generated pre-tests, deadline extraction, native calendar with external sync, global todo list
- **PWA + native combo** as originally planned (web app holds main features, native app is just the locker)
- **Copilot Studio deployment** as the actual agent runtime once licensing/access is sorted

## Out of Scope (v1)

- Everything in the broader vision doc that isn't the locking + negotiation loop
- Anything requiring user accounts, auth, or a backend
- Anything that requires the user to grant elevated system permissions beyond standard Electron capabilities

## Open Questions

- Polling interval for window title detection (start at 2s, tune if it feels laggy)
- Exact visual design of the orb and lock UI (TBD in implementation)
- Whether the main app window is needed at all in v1, or if everything can live in the orb + lock modal