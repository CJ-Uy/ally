# Scene 4 Test Coverage Explainer Design

## Context

The integrated Academic Ally video uses Scene 4 to show that the agent system was evaluated before the product demo. Copilot Studio will show the evaluation statistics and pass/fail evidence directly, so the Remotion segment should not duplicate the stats panel. Its job is to explain what the tests cover and how that coverage maps to the Academic Ally app experience.

Source materials:

- `/Users/gabrielmatthewlabariento/Downloads/Academic_Ally_Evaluation_Test_Cases_Formatted.pdf`
- `/Users/gabrielmatthewlabariento/Downloads/academic_ally_integrated_video_script_with_agent_evaluation.md`
- Ally design system in `/Users/gabrielmatthewlabariento/ally/DESIGN.md`
- Existing Remotion project in `/Users/gabrielmatthewlabariento/ally/demo-video`

## Goal

Create a Remotion composition that supplements Scene 4 with a 60-75 second visual explainer. The animation should answer:

1. What parts of the agent system were tested?
2. Which app features do those test areas validate?
3. Why should the viewer trust the upcoming app demo?

The segment should hand off naturally to Copilot Studio, where the actual evaluation table, status results, and detailed stats are shown.

## Recommended Direction

Use a script-synced coverage map rather than a pass/fail dashboard.

The visual language should feel like an Ally-native evaluation board: soft paper background, warm cards, pastel accents, compact stickers, Bricolage Grotesque headings, Onest body copy, DM Mono labels, and the Ally fox mark as a quiet brand anchor.

## Narrative Structure

### 1. Opening Frame: "What Did We Test?"

Duration: 8-10 seconds.

Visuals:

- Ally-branded title card.
- A small "58 test cases" sticker.
- Five category chips appear around the title.

Message:

Academic Ally's agents were evaluated across the same responsibilities shown in the app demo.

### 2. Coverage Map

Duration: 22-28 seconds.

Visuals:

- Left side: five evaluation categories from the PDF.
- Right side: app features validated by those categories.
- Animated connector lines map tests to product surfaces.

Mapping:

| Evaluation Coverage | App Feature Validated |
| --- | --- |
| Routing, onboarding, and profile | Student setup, study limits, availability, preferences |
| Syllabus extraction and confirmation | Course detection, deadlines, grading weights, uncertainty review |
| Diagnostic and workload planning | Pre-test, weak topics, priority ranking, overload detection |
| Execution, notifications, focus, and breaks | To-do list, calendar blocks, notifications, lock mode, break decisions |
| Dashboard, architecture, and edge cases | Final dashboard, agent explanation, fallback behavior, hallucination checks |

### 3. Representative Prompt Flow

Duration: 18-22 seconds.

Visuals:

- Three compact prompt cards slide in one at a time.
- Each card shows a short prompt label, the intended agent, the validated app behavior, and a "covered" sticker.

Representative flows:

- Onboarding prompt -> Student Profile Agent -> profile and availability setup.
- Syllabus prompt -> Syllabus Intelligence Agent -> deadlines, grading weights, uncertain items.
- Guardrail prompt -> Parent Orchestrator -> confirmation before saving schedules.

The animation should avoid detailed pass/fail tables because Copilot Studio handles that next.

### 4. Feature Confidence Summary

Duration: 10-12 seconds.

Visuals:

- A feature checklist fills in: profile, syllabus, diagnostic, workload, calendar, focus, dashboard, edge cases.
- The Ally fox appears near the checklist as a small companion mark, not a large mascot scene.

Message:

The tests cover the main user journey and the guardrails around it.

### 5. Copilot Studio Handoff

Duration: 5-7 seconds.

Visuals:

- The coverage map compresses into a single "Evaluation coverage ready" card.
- Text cue: "Next: the evaluation stats in Copilot Studio."

Message:

The Remotion segment explains coverage; Copilot Studio provides the evidence table.

## Composition

Add a new Remotion composition to the existing `demo-video` project:

- Composition ID: `AcademicAllyEvaluationCoverage`
- Output path: `out/academic-ally-evaluation-coverage.mp4`
- Resolution: 1920 x 1080
- FPS: 30
- Duration: 60-75 seconds

The composition should be separate from `AcademicAllyAgentArchitecture` and `AcademicAllyFullDemo` so it can be exported and inserted as Scene 4.

## Data

Use a structured data file so the content can be adjusted without editing animation code:

- `src/data/evaluationCoverage.json`

Expected data shape:

- Summary metrics: total test cases, category count, source label.
- Category entries: name, count, accent, tested behavior, mapped app features.
- Representative prompt flows: prompt label, short prompt, expected route, validated feature.
- Handoff copy.

The extracted PDF facts to include are:

- 58 total test cases.
- Five evaluation categories.
- Category counts: 10, 12, 12, 12, and 12.
- The main tested areas: routing/onboarding/profile; syllabus extraction/confirmation; diagnostic/workload planning; execution/notifications/focus/breaks; dashboard/architecture/edge cases.

## Visual Style

Follow the Ally design system:

- Background: `#eef2f7` with CSS-only paper texture.
- Panel: `#f9fbfd`.
- Ink: `#1e2a3d`.
- Soft ink: `#6b7a93`.
- Line: `#dde5ee`.
- Accents: sky, sage, butter, blush, fox orange, and restrained blue.
- Typography: Bricolage Grotesque for headings, Onest for body, DM Mono for labels.
- Cards should be warm and tactile, with light borders and subtle shadows.

Avoid:

- Dense spreadsheets inside Remotion.
- Treating the segment as a fake Copilot Studio screen.
- Over-emphasizing pass/fail status.
- Visuals that imply the app itself ran the tests.

## Components

Create focused components:

- `EvaluationCoverageClip`: top-level scene timing and layout.
- `CoverageCategoryCard`: displays a test category and count.
- `FeatureMap`: draws category-to-feature connectors.
- `PromptFlowCard`: shows a representative prompt mapped to an agent and product behavior.
- `CoverageSummary`: final feature checklist and handoff.
- Shared local helpers for easing, fade, spring entry, and text reveal if they match existing Remotion patterns.

## Error Handling

This is a static Remotion animation, so runtime error handling is mostly data validation:

- Check that category counts sum to the summary total.
- Check that each category has at least one mapped feature.
- Check that representative prompt flows have prompt, route, and validated feature text.

Use or extend the existing motion-data check script pattern in `demo-video/scripts`.

## Verification

Before declaring the video ready:

1. Run TypeScript typecheck in `demo-video`.
2. Run the motion/data validation script.
3. Render at least one still from the opening, map, prompt-flow, and final handoff sections.
4. Render the final MP4.
5. Inspect stills for text overflow, readable hierarchy, and Ally design-system consistency.

## Out Of Scope

- Building the Copilot Studio evaluation panel.
- Recreating the full PDF table in Remotion.
- Showing every individual test case.
- Editing the main integrated script.
- Changing the app UI or agent backend.

