# Scene 4 Test Coverage Explainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Remotion Scene 4 clip that explains Academic Ally evaluation coverage and maps each test category to app features, while leaving detailed pass/fail stats to Copilot Studio.

**Architecture:** Add a data-driven Remotion composition to the existing `demo-video` project. The data file owns coverage categories and representative prompt flows; the React component owns the animation and Ally design-system styling; a validation script checks the data before rendering.

**Tech Stack:** Remotion 4, React 18, TypeScript, JSON data modules, Node validation scripts, existing Ally `public/ally.png` asset.

---

## File Structure

- Create `demo-video/src/data/evaluationCoverage.json`: structured source data for metrics, category-to-feature mapping, prompt flows, and handoff copy.
- Create `demo-video/src/components/EvaluationCoverageClip.tsx`: standalone Remotion animation for the Scene 4 coverage explainer.
- Create `demo-video/scripts/check-evaluation-coverage-data.mjs`: validates category totals, required fields, and prompt-flow completeness.
- Modify `demo-video/src/Root.tsx`: registers `AcademicAllyEvaluationCoverage`.
- Modify `demo-video/package.json`: adds `check:evaluation` and `render:evaluation` scripts.
- Modify `demo-video/README.md`: documents the new Scene 4 clip and render command.

---

### Task 1: Add Evaluation Coverage Data

**Files:**
- Create: `/Users/gabrielmatthewlabariento/ally/demo-video/src/data/evaluationCoverage.json`

- [ ] **Step 1: Create the data file**

Use this exact JSON structure:

```json
{
  "title": "Evaluation Coverage Map",
  "subtitle": "What the tests validate before the app demo",
  "summary": {
    "totalTestCases": 58,
    "categoryCount": 5,
    "sourceLabel": "Academic Ally evaluation test set"
  },
  "categories": [
    {
      "name": "Routing, Onboarding, and Profile",
      "shortName": "Profile",
      "count": 10,
      "accent": "#4a6fa5",
      "testedBehavior": "Routes student setup prompts and captures study hours, availability, preferences, and goals.",
      "features": ["Student setup", "Study limits", "Availability", "Preferences"]
    },
    {
      "name": "Syllabus Extraction and Confirmation",
      "shortName": "Syllabus",
      "count": 12,
      "accent": "#f5a66b",
      "testedBehavior": "Detects courses, extracts deadlines and grading weights, and flags uncertain information for review.",
      "features": ["Course detection", "Deadlines", "Grading weights", "Uncertainty review"]
    },
    {
      "name": "Diagnostic and Workload Planning",
      "shortName": "Planning",
      "count": 12,
      "accent": "#b8d0c4",
      "testedBehavior": "Uses familiarity, difficulty, grading weight, urgency, and available time to prioritize work.",
      "features": ["Pre-test", "Weak topics", "Priority ranking", "Overload detection"]
    },
    {
      "name": "Execution, Notifications, Focus, and Breaks",
      "shortName": "Execution",
      "count": 12,
      "accent": "#f4c9c2",
      "testedBehavior": "Simulates to-do lists, calendar blocks, notification rules, focus sessions, and reasonable break decisions.",
      "features": ["To-do list", "Calendar blocks", "Notifications", "Focus lock", "Break decisions"]
    },
    {
      "name": "Dashboard, Architecture, and Edge Cases",
      "shortName": "Edge Cases",
      "count": 12,
      "accent": "#caddec",
      "testedBehavior": "Checks final dashboard summaries, agent explanations, fallback behavior, data minimization, and hallucination resistance.",
      "features": ["Final dashboard", "Agent explanation", "Fallbacks", "Hallucination checks"]
    }
  ],
  "promptFlows": [
    {
      "label": "Onboarding prompt",
      "prompt": "I can study 12 hours per week after class.",
      "route": "Student Profile Agent",
      "validatedFeature": "Profile and availability setup"
    },
    {
      "label": "Syllabus prompt",
      "prompt": "Extract the deadlines, grading weights, and major requirements.",
      "route": "Syllabus Intelligence Agent",
      "validatedFeature": "Course requirements review"
    },
    {
      "label": "Guardrail prompt",
      "prompt": "Add everything to my calendar now.",
      "route": "Parent Orchestrator",
      "validatedFeature": "Confirmation before saving schedules"
    }
  ],
  "featureChecklist": [
    "Profile",
    "Syllabus",
    "Diagnostic",
    "Workload",
    "Calendar",
    "Focus",
    "Dashboard",
    "Edge cases"
  ],
  "handoff": {
    "title": "Coverage explained",
    "subtitle": "Next: evaluation stats in Copilot Studio"
  }
}
```

- [ ] **Step 2: Verify JSON parses**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('/Users/gabrielmatthewlabariento/ally/demo-video/src/data/evaluationCoverage.json','utf8')); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add /Users/gabrielmatthewlabariento/ally/demo-video/src/data/evaluationCoverage.json
git commit -m "Add evaluation coverage data"
```

---

### Task 2: Add Data Validation

**Files:**
- Create: `/Users/gabrielmatthewlabariento/ally/demo-video/scripts/check-evaluation-coverage-data.mjs`
- Modify: `/Users/gabrielmatthewlabariento/ally/demo-video/package.json`

- [ ] **Step 1: Write the validation script**

Create `check-evaluation-coverage-data.mjs`:

```js
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const data = JSON.parse(readFileSync(join(root, "src", "data", "evaluationCoverage.json"), "utf8"));
const failures = [];

if (data.summary.totalTestCases !== 58) {
  failures.push("summary.totalTestCases must be 58");
}

if (!Array.isArray(data.categories) || data.categories.length !== data.summary.categoryCount) {
  failures.push("categories length must match summary.categoryCount");
}

const categoryTotal = (data.categories ?? []).reduce((sum, category) => sum + Number(category.count ?? 0), 0);
if (categoryTotal !== data.summary.totalTestCases) {
  failures.push(`category counts must sum to ${data.summary.totalTestCases}, received ${categoryTotal}`);
}

for (const category of data.categories ?? []) {
  if (!category.name || !category.shortName || !category.accent || !category.testedBehavior) {
    failures.push(`${category.name ?? "unknown category"} is missing name, shortName, accent, or testedBehavior`);
  }
  if (!Array.isArray(category.features) || category.features.length === 0) {
    failures.push(`${category.name ?? "unknown category"} must include at least one mapped feature`);
  }
}

if (!Array.isArray(data.promptFlows) || data.promptFlows.length !== 3) {
  failures.push("promptFlows must include exactly three representative flows");
}

for (const flow of data.promptFlows ?? []) {
  if (!flow.label || !flow.prompt || !flow.route || !flow.validatedFeature) {
    failures.push(`${flow.label ?? "unknown flow"} is missing label, prompt, route, or validatedFeature`);
  }
}

if (!Array.isArray(data.featureChecklist) || data.featureChecklist.length < 8) {
  failures.push("featureChecklist must include at least eight feature labels");
}

if (!data.handoff?.title || !data.handoff?.subtitle) {
  failures.push("handoff must include title and subtitle");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Evaluation coverage data verified: ${data.summary.totalTestCases} tests across ${data.categories.length} categories.`);
```

- [ ] **Step 2: Add package scripts**

Update the `scripts` object in `package.json` to include:

```json
"check:evaluation": "node scripts/check-evaluation-coverage-data.mjs",
"render:evaluation": "remotion render src/index.ts AcademicAllyEvaluationCoverage out/academic-ally-evaluation-coverage.mp4"
```

- [ ] **Step 3: Run validation**

Run:

```bash
npm run check:evaluation
```

Expected:

```text
Evaluation coverage data verified: 58 tests across 5 categories.
```

- [ ] **Step 4: Commit**

```bash
git add /Users/gabrielmatthewlabariento/ally/demo-video/scripts/check-evaluation-coverage-data.mjs /Users/gabrielmatthewlabariento/ally/demo-video/package.json
git commit -m "Add evaluation coverage data check"
```

---

### Task 3: Build the Evaluation Coverage Clip

**Files:**
- Create: `/Users/gabrielmatthewlabariento/ally/demo-video/src/components/EvaluationCoverageClip.tsx`

- [ ] **Step 1: Create the component**

Create a data-driven Remotion component with these exports and constants:

```tsx
export const EVALUATION_COVERAGE_DURATION_SECONDS = 70;

export function EvaluationCoverageClip() {
  // Use useCurrentFrame/useVideoConfig.
  // Render five stages: intro, feature map, prompt flows, checklist, Copilot handoff.
}
```

The file must import:

```tsx
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import coverage from "../data/evaluationCoverage.json";
```

Use local TypeScript interfaces for categories and prompt flows:

```tsx
interface CoverageCategory {
  name: string;
  shortName: string;
  count: number;
  accent: string;
  testedBehavior: string;
  features: string[];
}

interface PromptFlow {
  label: string;
  prompt: string;
  route: string;
  validatedFeature: string;
}
```

- [ ] **Step 2: Implement the visual system**

Add local design constants:

```tsx
const palette = {
  bg: "#eef2f7",
  panel: "#f9fbfd",
  ink: "#1e2a3d",
  soft: "#6b7a93",
  line: "#dde5ee",
  sky: "#caddec",
  sage: "#b8d0c4",
  butter: "#f0e0b5",
  blush: "#f4c9c2",
  fox: "#f5a66b",
  accent: "#4a6fa5",
};
```

Use `@import` in a component-level `<style>` tag for Bricolage Grotesque, Onest, and DM Mono. Use CSS-only paper texture on the background and cards.

- [ ] **Step 3: Implement the stages**

The component should render:

1. Intro title from frame 0 to 300.
2. Coverage map from frame 210 to 1050.
3. Prompt flows from frame 900 to 1470.
4. Feature checklist from frame 1380 to 1830.
5. Copilot Studio handoff from frame 1770 to 2100.

At 30 fps and 2100 frames, this yields a 70-second clip.

- [ ] **Step 4: Ensure readable layout**

Use fixed dimensions and explicit typography:

- Main title: 76-88px.
- Section heading: 54-64px.
- Card titles: 25-31px.
- Body copy: 20-24px.
- Sticker labels: 16-18px DM Mono.

Avoid viewport-width font sizing.

- [ ] **Step 5: Commit**

```bash
git add /Users/gabrielmatthewlabariento/ally/demo-video/src/components/EvaluationCoverageClip.tsx
git commit -m "Add evaluation coverage Remotion clip"
```

---

### Task 4: Register and Document the Composition

**Files:**
- Modify: `/Users/gabrielmatthewlabariento/ally/demo-video/src/Root.tsx`
- Modify: `/Users/gabrielmatthewlabariento/ally/demo-video/README.md`

- [ ] **Step 1: Register the composition**

Import the component and duration:

```tsx
import {
  EVALUATION_COVERAGE_DURATION_SECONDS,
  EvaluationCoverageClip,
} from "./components/EvaluationCoverageClip";
```

Add a composition:

```tsx
<Composition
  id="AcademicAllyEvaluationCoverage"
  component={EvaluationCoverageClip}
  durationInFrames={EVALUATION_COVERAGE_DURATION_SECONDS * FPS}
  fps={FPS}
  width={WIDTH}
  height={HEIGHT}
/>
```

- [ ] **Step 2: Update README**

Add:

```markdown
## Render Scene 4 evaluation coverage explainer

```bash
npm run check:evaluation
npm run render:evaluation
```

Output:

```text
out/academic-ally-evaluation-coverage.mp4
```

This Scene 4 insert explains what the evaluation test set covers and how each category maps to the app demo. Copilot Studio should still be used for the detailed evaluation stats and pass/fail evidence.
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: success.

- [ ] **Step 4: Commit**

```bash
git add /Users/gabrielmatthewlabariento/ally/demo-video/src/Root.tsx /Users/gabrielmatthewlabariento/ally/demo-video/README.md
git commit -m "Register evaluation coverage composition"
```

---

### Task 5: Render and Verify

**Files:**
- Generated: `/Users/gabrielmatthewlabariento/ally/demo-video/out/academic-ally-evaluation-coverage.mp4`
- Generated: `/Users/gabrielmatthewlabariento/ally/demo-video/out/stills/evaluation-coverage-*.png`

- [ ] **Step 1: Run all relevant checks**

Run:

```bash
npm run check:evaluation
npm run typecheck
```

Expected: both succeed.

- [ ] **Step 2: Render stills**

Run:

```bash
mkdir -p out/stills
npx remotion still src/index.ts AcademicAllyEvaluationCoverage 90 out/stills/evaluation-coverage-intro.png
npx remotion still src/index.ts AcademicAllyEvaluationCoverage 480 out/stills/evaluation-coverage-map.png
npx remotion still src/index.ts AcademicAllyEvaluationCoverage 1140 out/stills/evaluation-coverage-prompts.png
npx remotion still src/index.ts AcademicAllyEvaluationCoverage 1860 out/stills/evaluation-coverage-handoff.png
```

Expected: four PNGs are created.

- [ ] **Step 3: Inspect stills**

Open or view the stills and check:

- No text overlap.
- Cards fit on screen.
- Connectors point between categories and features.
- The final handoff clearly says Copilot Studio shows the stats.

- [ ] **Step 4: Render the MP4**

Run:

```bash
npm run render:evaluation
```

Expected output:

```text
out/academic-ally-evaluation-coverage.mp4
```

- [ ] **Step 5: Commit final generated source updates only**

Do not commit generated MP4 or stills unless the project already tracks rendered outputs intentionally. Check `git status --short` and commit only source/documentation files that belong to this task.

