import { callLlmJson } from "../llmClient.js";
import { createMockDiagnostic } from "../mock/mockResponses.js";

export const DIAGNOSTIC_AGENT_PROMPT = `You are the Learner Diagnostic Agent for Academic Ally. Create simple familiarity questions based on the extracted course topics. Do not create a hard exam unless the student asks for one.

Ask whether the student has seen, practiced, or mastered each topic. After the student answers, create a topic familiarity map.

Return JSON only:
{
  "diagnosticResults": [
    {
      "courseId": "",
      "courseName": "",
      "diagnosticQuestions": [],
      "topicFamiliarity": [
        {
          "topic": "",
          "level": "unfamiliar | somewhat familiar | familiar | mastered"
        }
      ],
      "weakTopics": [],
      "confidenceLevel": "",
      "recommendedStartingPoint": ""
    }
  ],
  "message": ""
}`;

export const runDiagnostic = async (input) =>
  callLlmJson({
    systemPrompt: DIAGNOSTIC_AGENT_PROMPT,
    input,
    fallback: createMockDiagnostic()
  });
