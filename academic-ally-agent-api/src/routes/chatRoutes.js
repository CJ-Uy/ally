import express from "express";

import { config, DEFAULT_STUDENT_ID } from "../config.js";
import { getNextRecommendedStep, runOrchestrator } from "../agents/orchestratorAgent.js";
import { getStudentState, mergeStudentState } from "../state/demoState.js";
import { asyncHandler, successResponse } from "../utils/responseUtils.js";
import {
  confirmRequirements,
  evaluateBreakRequest,
  executePlan,
  extractSyllabus,
  onboardStudent,
  planWeek,
  runDiagnostic,
  startFocusSession
} from "./workflowRoutes.js";

export const chatRouter = express.Router();

const includesAny = (message, terms) => terms.some((term) => message.includes(term));
const looksLikeLargeSyllabusText = (message) =>
  message.length > 600 || includesAny(message, ["grading system", "important dates", "topics:"]);

const appendChatHistory = (studentId, entry) => {
  const state = getStudentState(studentId);
  return mergeStudentState(studentId, {
    chatHistory: [
      ...state.chatHistory,
      {
        at: config.demoMode ? "2026-06-08T18:00:00.000Z" : new Date().toISOString(),
        ...entry
      }
    ]
  });
};

const routeChatMessage = async ({ studentId, message }) => {
  const normalized = message.toLowerCase();
  const state = getStudentState(studentId);

  if (
    includesAny(normalized, [
      "start",
      "new",
      "onboard",
      "profile",
      "study hours"
    ])
  ) {
    return onboardStudent({
      studentId,
      educationLevel: state.studentProfile?.educationLevel || "College",
      studyHoursPerWeek: state.studentProfile?.studyHoursPerWeek || 12,
      availability: state.studentProfile?.availability || "Monday to Friday, 7 PM to 10 PM",
      studyStyle:
        state.studentProfile?.studyStyle || "Focused study blocks with short breaks",
      goals: state.studentProfile?.goals || "Stay on top of classes",
      notificationPreferences:
        state.studentProfile?.notificationPreferences ||
        "Remind me before study blocks and major deadlines"
    });
  }

  if (
    includesAny(normalized, ["syllabus", "course", "deadline", "exam"]) ||
    looksLikeLargeSyllabusText(normalized)
  ) {
    return extractSyllabus({
      studentId,
      syllabusText: message
    });
  }

  if (
    includesAny(normalized, ["yes", "confirm", "correct"]) &&
    state.extractedRequirements.length > 0
  ) {
    return confirmRequirements({
      studentId,
      confirmed: true,
      corrections: []
    });
  }

  if (
    includesAny(normalized, ["familiar", "diagnostic", "pre-test", "what i know"])
  ) {
    return runDiagnostic({
      studentId,
      studentAnswers: message
    });
  }

  if (includesAny(normalized, ["plan", "schedule", "week", "prioritize"])) {
    return planWeek({
      studentId,
      planningRange: "next 7 days"
    });
  }

  if (
    includesAny(normalized, ["approve", "create calendar", "to-do", "reminders"])
  ) {
    return executePlan({
      studentId,
      approved: true
    });
  }

  if (includesAny(normalized, ["focus", "lock in", "start session"])) {
    return startFocusSession({
      studentId,
      studyBlockId: state.proposedStudyBlocks[0]?.studyBlockId || "block-001",
      allowedApps: ["Notes", "Browser"],
      blockedApps: ["TikTok", "Instagram", "YouTube"]
    });
  }

  if (includesAny(normalized, ["skip", "break", "exhausted", "tired"])) {
    return evaluateBreakRequest({
      studentId,
      studyBlockId: state.proposedStudyBlocks[0]?.studyBlockId || "block-001",
      reason: message,
      fatigueRating: includesAny(normalized, ["exhausted", "tired"]) ? 8 : 6
    });
  }

  const orchestratorResult = await runOrchestrator({ message, state });
  const recommendation =
    orchestratorResult?.user_facing_message || getNextRecommendedStep(state).user_facing_message;

  return successResponse({
    module: "Academic Ally Orchestrator",
    message: recommendation,
    data: {
      currentStep: orchestratorResult.current_step || "",
      moduleUsed: orchestratorResult.module_used || "",
      nextAction: orchestratorResult.next_action || "",
      confidence: orchestratorResult.confidence || 0
    },
    state
  });
};

chatRouter.post(
  "/chat",
  asyncHandler(async (req, res) => {
    const studentId = req.body?.studentId || DEFAULT_STUDENT_ID;
    const message = String(req.body?.message || "").trim();

    if (!message) {
      const error = new Error("message is required.");
      error.status = 400;
      throw error;
    }

    appendChatHistory(studentId, {
      role: "student",
      message
    });

    const response = await routeChatMessage({ studentId, message });

    const updatedState = appendChatHistory(studentId, {
      role: "assistant",
      module: response.module,
      message: response.message
    });

    res.json({
      ...response,
      state: updatedState
    });
  })
);
