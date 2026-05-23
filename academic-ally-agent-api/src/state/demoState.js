import { DEFAULT_STUDENT_ID } from "../config.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

const createInitialState = (studentId = DEFAULT_STUDENT_ID) => ({
  studentId,
  studentProfile: null,
  detectedCourses: [],
  extractedRequirements: [],
  confirmedTasks: [],
  diagnosticResults: [],
  priorityRanking: [],
  proposedStudyBlocks: [],
  globalTodoList: [],
  courseTaskLists: {},
  calendarEvents: [],
  notificationRules: [],
  focusStatus: null,
  breakRequests: [],
  chatHistory: []
});

const studentStates = new Map();

export const getStudentState = (studentId = DEFAULT_STUDENT_ID) => {
  if (!studentStates.has(studentId)) {
    studentStates.set(studentId, createInitialState(studentId));
  }

  return clone(studentStates.get(studentId));
};

export const mergeStudentState = (studentId = DEFAULT_STUDENT_ID, patch = {}) => {
  const current = getStudentState(studentId);
  const next = {
    ...current,
    ...patch,
    studentId
  };

  studentStates.set(studentId, clone(next));
  return clone(next);
};

export const resetStudentState = (studentId = DEFAULT_STUDENT_ID) => {
  const next = createInitialState(studentId);
  studentStates.set(studentId, clone(next));
  return clone(next);
};

export const resetAllStudentStates = () => {
  studentStates.clear();
  return resetStudentState(DEFAULT_STUDENT_ID);
};
