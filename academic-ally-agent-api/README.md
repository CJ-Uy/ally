# Academic Ally Agent API

Local backend API for the Academic Ally Electron demo app. It simulates a multi-agent academic planning assistant that turns student profile details and syllabus text into confirmed tasks, diagnostic weak-topic analysis, weekly study blocks, to-do lists, calendar events, reminders, focus-session policies, and humane break decisions.

The Electron app calls this backend on `http://localhost:3001`. Gemini API credentials stay server-side in this backend only.

## Setup

```bash
cd academic-ally-agent-api
npm install
cp .env.example .env
npm run dev
```

The dev server uses `nodemon` and starts on `http://localhost:3001` by default.

## Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Available variables:

```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
DEMO_MODE=true
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

When `DEMO_MODE=true`, the API does not call Gemini and returns deterministic mock data. This is the safest setting for video demos.

When `DEMO_MODE=false`, set `GEMINI_API_KEY` in the backend `.env`. Do not put this key in Electron, React, renderer, preload, or other frontend code.

## Response Shape

Successful responses:

```json
{
  "ok": true,
  "module": "Agent or module name",
  "message": "Human-readable summary",
  "data": {},
  "state": {}
}
```

Error responses:

```json
{
  "ok": false,
  "module": "Agent or module name",
  "message": "Error message",
  "error": {}
}
```

## Endpoints

### `GET /api/health`

Returns backend status, demo mode status, and Gemini model name.

### `GET /api/state`

Returns the current in-memory state for `demo-student-001`.

Optional query:

```txt
?studentId=demo-student-001
```

### `POST /api/state/reset`

Resets in-memory demo state.

```json
{
  "studentId": "demo-student-001"
}
```

Use `"studentId": "all"` to clear all in-memory states and recreate the default demo student.

### `POST /api/chat`

General orchestrator endpoint. Uses keyword and state-based routing to call the right internal module.

```json
{
  "studentId": "demo-student-001",
  "message": "Please plan my week"
}
```

### `POST /api/onboard`

Saves student profile details.

```json
{
  "studentId": "demo-student-001",
  "educationLevel": "College",
  "studyHoursPerWeek": 12,
  "availability": "Monday to Friday, 7 PM to 10 PM",
  "studyStyle": "Focused study blocks with short breaks",
  "goals": "Stay on top of classes",
  "notificationPreferences": "Remind me before study blocks and major deadlines"
}
```

### `POST /api/extract-syllabus`

Detects courses and extracts pending academic requirements.

```json
{
  "studentId": "demo-student-001",
  "syllabusText": "Course: Introduction to Data Science..."
}
```

Or:

```json
{
  "studentId": "demo-student-001",
  "syllabi": [
    {
      "fileName": "intro_data_science.txt",
      "text": "Course: Introduction to Data Science..."
    }
  ]
}
```

### `POST /api/confirm-requirements`

Confirms pending extracted requirements and saves them as tasks.

```json
{
  "studentId": "demo-student-001",
  "confirmed": true,
  "corrections": []
}
```

### `POST /api/diagnostic`

Creates a topic familiarity map and weak-topic recommendations.

```json
{
  "studentId": "demo-student-001",
  "studentAnswers": "I know basic charts and data cleaning, but I am weak in regression, classification, and eigenvalues."
}
```

### `POST /api/plan-week`

Creates a proposed weekly schedule. This does not create final calendar events yet.

```json
{
  "studentId": "demo-student-001",
  "planningRange": "next 7 days"
}
```

### `POST /api/execute-plan`

Creates simulated to-do lists, course task lists, calendar events, and notification rules after approval.

```json
{
  "studentId": "demo-student-001",
  "approved": true
}
```

### `POST /api/focus-session`

Returns a focus lock policy. The native Electron app enforces app locking; Gemini and the backend do not directly lock apps.

```json
{
  "studentId": "demo-student-001",
  "studyBlockId": "block-001",
  "allowedApps": ["Notes", "Browser"],
  "blockedApps": ["TikTok", "Instagram", "YouTube"]
}
```

### `POST /api/break-request`

Returns a humane break decision.

```json
{
  "studentId": "demo-student-001",
  "studyBlockId": "block-001",
  "reason": "I am exhausted",
  "fatigueRating": 8
}
```

## Example Electron Fetch

```js
const response = await fetch("http://localhost:3001/api/extract-syllabus", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    studentId: "demo-student-001",
    syllabusText
  })
});

const data = await response.json();
```

## Demo Flow

For a stable demo, keep `DEMO_MODE=true` and call endpoints in this order:

1. `POST /api/onboard`
2. `POST /api/extract-syllabus`
3. `POST /api/confirm-requirements`
4. `POST /api/diagnostic`
5. `POST /api/plan-week`
6. `POST /api/execute-plan`
7. `POST /api/focus-session`
8. `POST /api/break-request`
