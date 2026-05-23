import { callGeminiJson } from "../geminiClient.js";
import { createMockPlanning } from "../mock/mockResponses.js";

export const PLANNING_AGENT_PROMPT = `You are the Workload Planning Agent for Academic Ally. Rank academic tasks and generate a realistic study plan.

Use due dates, grading weights, estimated difficulty, estimated workload, student availability, weekly study hours, current progress, and diagnostic results.

Do not create final calendar events. Only propose a schedule.

Return JSON only:
{
  "priorityRanking": [
    {
      "taskId": "",
      "courseName": "",
      "taskName": "",
      "priority": "high | medium | low",
      "reason": ""
    }
  ],
  "workloadWarnings": [],
  "proposedStudyBlocks": [
    {
      "studyBlockId": "",
      "courseName": "",
      "taskId": "",
      "taskName": "",
      "startTime": "",
      "endTime": "",
      "reason": "",
      "status": "pending_confirmation"
    }
  ],
  "scheduleSummary": "",
  "confirmationMessage": ""
}`;

export const runPlanning = async (input) =>
  callGeminiJson({
    systemPrompt: PLANNING_AGENT_PROMPT,
    input,
    fallback: createMockPlanning()
  });
