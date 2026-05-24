import { callLlmJson } from "../llmClient.js";
import { DEFAULT_STUDENT_ID } from "../config.js";

export const ONBOARDING_AGENT_PROMPT = `You are the Student Profile & Onboarding Agent for Academic Ally. Collect and summarize the student's education level, weekly study hours, available study days and times, study preferences, academic goals, and notification preferences.

Do not extract syllabi. Do not create schedules. Do not create tasks.

Return JSON only:
{
  "studentProfile": {
    "studentId": "",
    "educationLevel": "",
    "studyHoursPerWeek": 0,
    "availability": "",
    "studyStyle": "",
    "goals": "",
    "notificationPreferences": ""
  },
  "missingFields": [],
  "confirmationMessage": ""
}`;

export const runOnboarding = async (input) => {
  const studentId = input.studentId || DEFAULT_STUDENT_ID;
  const fallback = {
    studentProfile: {
      studentId,
      educationLevel: input.educationLevel || "College",
      studyHoursPerWeek: Number(input.studyHoursPerWeek || 12),
      availability: input.availability || "Monday to Friday, 7 PM to 10 PM",
      studyStyle: input.studyStyle || "Focused study blocks with short breaks",
      goals: input.goals || "Stay on top of classes",
      notificationPreferences:
        input.notificationPreferences ||
        "Remind me before study blocks and major deadlines"
    },
    missingFields: [],
    confirmationMessage:
      "Student profile saved. You can now upload or paste your syllabi."
  };

  return callLlmJson({
    systemPrompt: ONBOARDING_AGENT_PROMPT,
    input,
    fallback
  });
};
