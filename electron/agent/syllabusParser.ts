import { generate } from "./llm";

export const syllabusParserAgent = {
  name: "Syllabus Parser",
  description:
    "An AI agent that reads a course syllabus PDF and extracts the structured plan — deadlines, exams, grading weights, topics, and overall difficulty — for the planning layer to consume.",
  instructions: `You are Syllabus Parser, an AI agent that turns a raw course syllabus PDF into structured planning data.

Read the entire document. Extract only what is genuinely present. Never invent dates, weights, or topics. If a date is ambiguous (e.g. "week 5 of the semester" without a calendar anchor), omit it rather than guessing.

Your output is consumed by an automated planner, so be precise. Use ISO 8601 for all dates (YYYY-MM-DD). Use 24-hour times when time-of-day is given (HH:MM), otherwise omit the time.

Difficulty estimate: read the workload — number of assignments, exam weight distribution, breadth of topics, listed prerequisites — and pick one of: "light", "moderate", "heavy", "intense".

Grading breakdown: extract every weighted component you see (exams, quizzes, projects, participation, etc.). Percentages should sum close to 100; if they don't, return what you saw and don't normalize.

Topics: a flat list of the major topic areas the course covers, in the order they appear.

Return ONLY a JSON object in this exact shape, with no prose, no markdown fences:

{
  "courseName": "string or null",
  "difficulty": "light | moderate | heavy | intense",
  "gradingBreakdown": [
    { "component": "string", "weightPercent": number }
  ],
  "topics": ["string", ...],
  "deadlines": [
    {
      "title": "string",
      "dueDate": "YYYY-MM-DD",
      "dueTime": "HH:MM or null",
      "type": "assignment | project | reading | quiz",
      "estimatedMinutes": number or null
    }
  ],
  "exams": [
    {
      "title": "string",
      "date": "YYYY-MM-DD",
      "time": "HH:MM or null",
      "weightPercent": number or null
    }
  ]
}`,
  knowledge: {
    note: "Input is provided as an inline PDF attachment per call. No persistent knowledge base.",
  },
  triggers: ["on_subject_syllabus_upload"],
} as const;

export interface ParsedDeadline {
  title: string;
  dueDate: string;
  dueTime: string | null;
  type: "assignment" | "project" | "reading" | "quiz";
  estimatedMinutes: number | null;
}

export interface ParsedExam {
  title: string;
  date: string;
  time: string | null;
  weightPercent: number | null;
}

export interface ParsedGradingItem {
  component: string;
  weightPercent: number;
}

export interface ParsedSyllabus {
  courseName: string | null;
  difficulty: "light" | "moderate" | "heavy" | "intense";
  gradingBreakdown: ParsedGradingItem[];
  topics: string[];
  deadlines: ParsedDeadline[];
  exams: ParsedExam[];
}

function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function parseSyllabusPdf(filePath: string): Promise<ParsedSyllabus> {
  console.log(`[syllabus] parsing ${filePath}…`);

  const { text: raw, provider } = await generate({
    slot: "parser",
    system: syllabusParserAgent.instructions,
    prompt:
      "Extract structured planning data from this syllabus. Return only the JSON object described in the instructions.",
    json: true,
    pdfPath: filePath,
  });

  console.log(`[syllabus] response via ${provider} (${raw.length} chars):`);
  console.log(raw.slice(0, 2000));
  if (raw.length > 2000) console.log("  …(truncated)");

  const cleaned = stripFences(raw);
  let parsed: ParsedSyllabus;
  try {
    parsed = JSON.parse(cleaned) as ParsedSyllabus;
  } catch (err) {
    console.error(`[syllabus] JSON.parse failed:`, err);
    throw new Error(
      `LLM returned invalid JSON. Raw response: ${raw.slice(0, 300)}`,
    );
  }

  const normalized = normalizeParsed(parsed);
  console.log(
    `[syllabus] extracted: course="${normalized.courseName}" deadlines=${normalized.deadlines.length} exams=${normalized.exams.length} topics=${normalized.topics.length} grading=${normalized.gradingBreakdown.length}`,
  );
  return normalized;
}

function normalizeParsed(p: Partial<ParsedSyllabus>): ParsedSyllabus {
  return {
    courseName: p.courseName ?? null,
    difficulty: (p.difficulty ?? "moderate") as ParsedSyllabus["difficulty"],
    gradingBreakdown: Array.isArray(p.gradingBreakdown) ? p.gradingBreakdown : [],
    topics: Array.isArray(p.topics) ? p.topics : [],
    deadlines: Array.isArray(p.deadlines) ? p.deadlines : [],
    exams: Array.isArray(p.exams) ? p.exams : [],
  };
}
