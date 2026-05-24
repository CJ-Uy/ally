import { callLlmJson } from "../llmClient.js";
import {
  createMockBreakDecision,
  createMockExecution,
  createMockFocusStatus
} from "../mock/mockResponses.js";

export const EXECUTION_AGENT_PROMPT = `You are the Execution & Accountability Agent for Academic Ally. After the student confirms the proposed schedule, create simulated global to-do lists, course-specific task lists, calendar events, notification rules, focus sessions, progress logs, and break request decisions.

For focus lock, say that the native app enforces app locking. Do not claim Gemini directly locks phone apps.

Return JSON only:
{
  "globalTodoList": [
    {
      "taskId": "",
      "courseName": "",
      "taskName": "",
      "dueDate": "",
      "status": "not_started | in_progress | scheduled | completed | overdue",
      "priority": "high | medium | low"
    }
  ],
  "courseTaskLists": {},
  "calendarEvents": [
    {
      "eventId": "",
      "title": "",
      "startTime": "",
      "endTime": "",
      "description": ""
    }
  ],
  "notificationRules": [
    {
      "notificationId": "",
      "type": "study_block | deadline | overdue | workload_warning",
      "message": "",
      "scheduledTime": ""
    }
  ],
  "focusStatus": null,
  "nextStudyBlock": "",
  "accountabilityMessage": ""
}`;

export const runExecution = async (input) =>
  callLlmJson({
    systemPrompt: EXECUTION_AGENT_PROMPT,
    input,
    fallback: createMockExecution()
  });

export const runFocusSession = async (input) =>
  callLlmJson({
    systemPrompt: EXECUTION_AGENT_PROMPT,
    input: {
      ...input,
      instruction:
        "Create a focus session policy. Clarify that the native Electron app enforces app locking, not Gemini or the backend directly."
    },
    fallback: {
      focusStatus: createMockFocusStatus(input)
    }
  });

export const runBreakRequest = async (input) =>
  callLlmJson({
    systemPrompt: EXECUTION_AGENT_PROMPT,
    input: {
      ...input,
      instruction:
        "Evaluate this break request humanely. Approve a break, suggest a shorter break, or reschedule based on fatigue."
    },
    fallback: {
      breakDecision: createMockBreakDecision(input)
    }
  });
