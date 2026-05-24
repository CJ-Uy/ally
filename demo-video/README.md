# Academic Ally App-Exact Demo Video

Standalone capture and Remotion source for product demo clips that use the real
Ally app UI. Script-only scenes that do not exist in the app are intentionally
omitted.

## Install

```bash
npm install
```

## Capture app screens

```bash
npm run capture:app
```

Outputs:

```text
captures/app-screens/*.png
public/captures/app-screens/*.png
```

The capture script starts a Vite server with `ALLY_DEMO_CAPTURE=1` and
`VITE_ALLY_DEMO_CAPTURE=1`, then drives the real Ally UI with deterministic
mocked `window.api` data. It does not call Turso, Gemini, R2, Electron IPC, or
native dialogs.

## Preview

```bash
npm run preview
```

## Render full review video

```bash
npm run render:full
```

Output:

```text
out/academic-ally-full-demo.mp4
```

## Render agent architecture explainer

```bash
npm run render:agents
```

Output:

```text
out/academic-ally-agent-architecture.mp4
```

This is a script-grounded Remotion animation for the parent orchestrator and
five specialist agents. The architecture data lives in
`src/data/agentArchitecture.json`.

## Render Scene 4 evaluation coverage explainer

```bash
npm run check:evaluation
npm run render:evaluation
```

Output:

```text
out/academic-ally-evaluation-coverage.mp4
```

This Scene 4 insert explains what the evaluation test set covers and how each
category maps to the app demo. Copilot Studio should still be used for the
detailed evaluation stats and pass/fail evidence.

## Render editor-friendly scene clips

```bash
npm run render:clips
```

Outputs:

```text
out/clips/01-onboarding-profile.mp4
out/clips/02-syllabus-upload.mp4
...
out/clips/12-dashboard.mp4
```

Run `npm run capture:app` before rendering if the captures are missing or stale.
