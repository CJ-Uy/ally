import { callLlmJson } from "../llmClient.js";

export const ORCHESTRATOR_AGENT_PROMPT = `You are Academic Ally, the parent orchestrator for a student academic planning app. Your job is to route the student through a simulated multi-agent workflow.

You coordinate five specialist modules:
1. Student Profile & Onboarding
2. Syllabus & Course Intelligence
3. Learner Diagnostic
4. Workload Planning
5. Execution & Accountability

Do not do specialist work yourself if a module should handle it. Your job is to decide the next step, summarize outputs, ask for confirmation, and maintain the flow.

Always require confirmation before saving courses, final tasks, schedules, calendar events, notifications, or focus sessions.

Workflow:
Onboarding -> Syllabus Intake -> Course Confirmation -> Requirement Extraction -> Requirement Confirmation -> Diagnostic -> Workload Planning -> Schedule Confirmation -> Execution -> Progress/Focus/Break Support.

Return JSON only:
{
  "current_step": "",
  "module_used": "",
  "user_facing_message": "",
  "next_action": "",
  "confidence": 0.0
}`;

export const getNextRecommendedStep = (state) => {
  if (!state.studentProfile) {
    return {
      current_step: "Onboarding",
      module_used: "Student Profile & Onboarding Agent",
      user_facing_message:
        "Let's start by saving your student profile: education level, weekly study hours, availability, study style, goals, and notification preferences.",
      next_action: "POST /api/onboard",
      confidence: 0.95
    };
  }

  if (state.extractedRequirements.length === 0 && state.confirmedTasks.length === 0) {
    return {
      current_step: "Syllabus Intake",
      module_used: "Syllabus & Course Intelligence Agent",
      user_facing_message:
        "Your profile is ready. Paste or upload syllabus text so I can detect courses and academic requirements for confirmation.",
      next_action: "POST /api/extract-syllabus",
      confidence: 0.95
    };
  }

  if (state.extractedRequirements.length > 0 && state.confirmedTasks.length === 0) {
    return {
      current_step: "Requirement Confirmation",
      module_used: "Syllabus & Course Intelligence Agent",
      user_facing_message:
        "I found pending requirements. Please confirm them before they become saved academic tasks.",
      next_action: "POST /api/confirm-requirements",
      confidence: 0.95
    };
  }

  if (state.diagnosticResults.length === 0) {
    return {
      current_step: "Diagnostic",
      module_used: "Learner Diagnostic Agent",
      user_facing_message:
        "Next, tell me what topics you already know so I can identify weak areas before planning your week.",
      next_action: "POST /api/diagnostic",
      confidence: 0.9
    };
  }

  if (state.proposedStudyBlocks.length === 0) {
    return {
      current_step: "Workload Planning",
      module_used: "Workload Planning Agent",
      user_facing_message:
        "I can now prioritize your confirmed tasks and propose a weekly schedule.",
      next_action: "POST /api/plan-week",
      confidence: 0.9
    };
  }

  if (state.calendarEvents.length === 0) {
    return {
      current_step: "Schedule Confirmation",
      module_used: "Execution & Accountability Agent",
      user_facing_message:
        "Your proposed schedule is ready. Approve it when you want me to create simulated to-dos, calendar events, and reminders.",
      next_action: "POST /api/execute-plan",
      confidence: 0.9
    };
  }

  return {
    current_step: "Progress Support",
    module_used: "Execution & Accountability Agent",
    user_facing_message:
      "Your academic plan is active. I can help start a focus session, evaluate a break request, or summarize your next study block.",
    next_action: "POST /api/focus-session or POST /api/break-request",
    confidence: 0.88
  };
};

export const runOrchestrator = async ({ message, state }) => {
  const fallback = getNextRecommendedStep(state);
  return callLlmJson({
    systemPrompt: ORCHESTRATOR_AGENT_PROMPT,
    input: { message, state },
    fallback
  });
};
