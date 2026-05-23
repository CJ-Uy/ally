import express from "express";

import { config, DEFAULT_STUDENT_ID } from "../config.js";
import { runDiagnostic as runDiagnosticAgent } from "../agents/diagnosticAgent.js";
import {
  runBreakRequest,
  runExecution,
  runFocusSession
} from "../agents/executionAgent.js";
import { runOnboarding } from "../agents/onboardingAgent.js";
import { runPlanning } from "../agents/planningAgent.js";
import { runSyllabusExtraction } from "../agents/syllabusAgent.js";
import { getStudentState, mergeStudentState } from "../state/demoState.js";
import { asyncHandler, successResponse } from "../utils/responseUtils.js";

export const workflowRouter = express.Router();

const moduleNames = {
  onboarding: "Student Profile & Onboarding Agent",
  syllabus: "Syllabus & Course Intelligence Agent",
  diagnostic: "Learner Diagnostic Agent",
  planning: "Workload Planning Agent",
  execution: "Execution & Accountability Agent"
};

const getStudentId = (payload = {}) => payload.studentId || DEFAULT_STUDENT_ID;

export const onboardStudent = async (payload) => {
  const studentId = getStudentId(payload);
  const result = await runOnboarding({ ...payload, studentId });
  const studentProfile = {
    studentId,
    ...(result.studentProfile || {})
  };
  const state = mergeStudentState(studentId, { studentProfile });

  return successResponse({
    module: moduleNames.onboarding,
    message:
      result.confirmationMessage ||
      "Student profile saved. You can now upload or paste your syllabi.",
    data: {
      studentProfile,
      missingFields: result.missingFields || []
    },
    state
  });
};

export const extractSyllabus = async (payload) => {
  const studentId = getStudentId(payload);
  const hasSyllabusText = Boolean(payload.syllabusText || payload.syllabi?.length);

  if (!hasSyllabusText) {
    const error = new Error("Provide syllabusText or a syllabi array.");
    error.status = 400;
    throw error;
  }

  const result = await runSyllabusExtraction({ ...payload, studentId });
  const detectedCourses = result.detectedCourses || [];
  const extractedRequirements = result.extractedRequirements || [];
  const state = mergeStudentState(studentId, {
    detectedCourses,
    extractedRequirements
  });

  return successResponse({
    module: moduleNames.syllabus,
    message:
      result.confirmationMessage ||
      `I detected ${detectedCourses.length} courses and ${extractedRequirements.length} academic requirements. Please confirm before I save them as tasks.`,
    data: {
      detectedCourses,
      gradingWeights: result.gradingWeights || [],
      extractedRequirements,
      uncertainItems: result.uncertainItems || []
    },
    state
  });
};

export const confirmRequirements = async (payload) => {
  const studentId = getStudentId(payload);
  const currentState = getStudentState(studentId);

  if (!payload.confirmed) {
    const state = mergeStudentState(studentId, {
      extractedRequirements: currentState.extractedRequirements
    });

    return successResponse({
      module: moduleNames.syllabus,
      message:
        "Requirements were not confirmed. Send corrections or confirm when the extracted requirements look right.",
      data: {
        confirmedTasks: currentState.confirmedTasks,
        corrections: payload.corrections || []
      },
      state
    });
  }

  const correctedRequirements =
    Array.isArray(payload.corrections) && payload.corrections.length > 0
      ? payload.corrections
      : currentState.extractedRequirements;

  const state = mergeStudentState(studentId, {
    confirmedTasks: correctedRequirements,
    extractedRequirements: []
  });

  return successResponse({
    module: moduleNames.syllabus,
    message: `${correctedRequirements.length} requirements confirmed and saved as academic tasks.`,
    data: {
      confirmedTasks: correctedRequirements
    },
    state
  });
};

export const runDiagnostic = async (payload) => {
  const studentId = getStudentId(payload);
  const stateBefore = getStudentState(studentId);
  const result = await runDiagnosticAgent({
    ...payload,
    studentId,
    confirmedTasks: stateBefore.confirmedTasks,
    detectedCourses: stateBefore.detectedCourses
  });
  const diagnosticResults = result.diagnosticResults || [];
  const state = mergeStudentState(studentId, { diagnosticResults });

  return successResponse({
    module: moduleNames.diagnostic,
    message:
      result.message ||
      "Diagnostic complete. I identified weak topics and a recommended starting point.",
    data: {
      diagnosticResults
    },
    state
  });
};

export const planWeek = async (payload) => {
  const studentId = getStudentId(payload);
  const stateBefore = getStudentState(studentId);
  const result = await runPlanning({
    ...payload,
    studentId,
    state: stateBefore
  });
  const priorityRanking = result.priorityRanking || [];
  const proposedStudyBlocks = result.proposedStudyBlocks || [];
  const state = mergeStudentState(studentId, {
    priorityRanking,
    proposedStudyBlocks
  });

  return successResponse({
    module: moduleNames.planning,
    message:
      result.scheduleSummary ||
      "I created a proposed weekly schedule based on urgency, grading weight, difficulty, and your availability.",
    data: {
      priorityRanking,
      workloadWarnings: result.workloadWarnings || [],
      proposedStudyBlocks,
      confirmationMessage:
        result.confirmationMessage ||
        "Please confirm this schedule before I create calendar events, to-dos, or reminders."
    },
    state
  });
};

export const executePlan = async (payload) => {
  const studentId = getStudentId(payload);
  const stateBefore = getStudentState(studentId);

  if (!payload.approved) {
    return successResponse({
      module: moduleNames.execution,
      message:
        "Schedule was not approved. I will leave calendar events, to-dos, and notifications unchanged.",
      data: {
        approved: false
      },
      state: stateBefore
    });
  }

  const result = await runExecution({
    ...payload,
    studentId,
    state: stateBefore
  });
  const state = mergeStudentState(studentId, {
    globalTodoList: result.globalTodoList || [],
    courseTaskLists: result.courseTaskLists || {},
    calendarEvents: result.calendarEvents || [],
    notificationRules: result.notificationRules || [],
    focusStatus: result.focusStatus || stateBefore.focusStatus
  });

  return successResponse({
    module: moduleNames.execution,
    message:
      result.accountabilityMessage ||
      "I created simulated to-dos, course task lists, calendar events, and notification rules.",
    data: {
      globalTodoList: result.globalTodoList || [],
      courseTaskLists: result.courseTaskLists || {},
      calendarEvents: result.calendarEvents || [],
      notificationRules: result.notificationRules || [],
      focusStatus: result.focusStatus || null,
      nextStudyBlock: result.nextStudyBlock || ""
    },
    state
  });
};

export const startFocusSession = async (payload) => {
  const studentId = getStudentId(payload);
  const result = await runFocusSession({
    ...payload,
    studentId
  });
  const focusStatus = result.focusStatus || null;
  const state = mergeStudentState(studentId, { focusStatus });

  return successResponse({
    module: moduleNames.execution,
    message:
      focusStatus?.message ||
      "Focus mode is ready. The native Electron app enforces app locking; the backend only returns the focus policy.",
    data: {
      focusStatus
    },
    state
  });
};

export const evaluateBreakRequest = async (payload) => {
  const studentId = getStudentId(payload);
  const stateBefore = getStudentState(studentId);
  const result = await runBreakRequest({
    ...payload,
    studentId
  });
  const breakDecision = result.breakDecision || result;
  const breakRequests = [
    ...stateBefore.breakRequests,
    {
      requestedAt: config.demoMode ? "2026-06-08T20:05:00.000Z" : new Date().toISOString(),
      ...breakDecision
    }
  ];
  const state = mergeStudentState(studentId, { breakRequests });

  return successResponse({
    module: moduleNames.execution,
    message:
      breakDecision.message ||
      "I reviewed the break request and returned a humane next step.",
    data: {
      breakDecision
    },
    state
  });
};

workflowRouter.post(
  "/onboard",
  asyncHandler(async (req, res) => {
    res.json(await onboardStudent(req.body || {}));
  })
);

workflowRouter.post(
  "/extract-syllabus",
  asyncHandler(async (req, res) => {
    res.json(await extractSyllabus(req.body || {}));
  })
);

workflowRouter.post(
  "/confirm-requirements",
  asyncHandler(async (req, res) => {
    res.json(await confirmRequirements(req.body || {}));
  })
);

workflowRouter.post(
  "/diagnostic",
  asyncHandler(async (req, res) => {
    res.json(await runDiagnostic(req.body || {}));
  })
);

workflowRouter.post(
  "/plan-week",
  asyncHandler(async (req, res) => {
    res.json(await planWeek(req.body || {}));
  })
);

workflowRouter.post(
  "/execute-plan",
  asyncHandler(async (req, res) => {
    res.json(await executePlan(req.body || {}));
  })
);

workflowRouter.post(
  "/focus-session",
  asyncHandler(async (req, res) => {
    res.json(await startFocusSession(req.body || {}));
  })
);

workflowRouter.post(
  "/break-request",
  asyncHandler(async (req, res) => {
    res.json(await evaluateBreakRequest(req.body || {}));
  })
);
