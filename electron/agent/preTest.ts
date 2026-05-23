import { getSubject, type SubjectFamiliarity } from "../data/subjects";
import { db } from "../db";
import { syllabi } from "../../src/lib/schema";
import { eq, desc } from "drizzle-orm";
import { generate } from "./llm";

export const preTestAgent = {
  name: "Pre-Test Author",
  description:
    "An AI agent that writes a short, casual familiarity check (3–5 multiple-choice questions) for a subject so the planner can calibrate task durations and difficulty.",
  instructions: `You are Pre-Test Author. Write a SHORT, CASUAL familiarity check for the user — not a formal exam.

Rules:
- 3 to 5 multiple-choice questions, exactly 4 choices each.
- Conversational tone. Examples: "Have you seen a matrix before?", "Do you know what photosynthesis is?".
- Tag each question with a difficulty band: "beginner" | "familiar" | "confident". Mix the bands so the scoring layer can place the user.
- Beginner questions should be answerable by someone who's only heard the topic name. Confident questions probe genuine working knowledge.
- "correctIndex" is the 0-based index of the right choice.
- Use the subject name and the topic list (if provided) to ground each question. Never invent topics that aren't related to the subject.
- No prose, no markdown — return ONLY the JSON object described below.

Output shape:

{
  "questions": [
    {
      "prompt": "string",
      "choices": ["string", "string", "string", "string"],
      "correctIndex": 0,
      "band": "beginner | familiar | confident"
    }
  ]
}`,
  knowledge: {
    note: "Input is the subject name plus (optional) parsed topics list from the syllabus.",
  },
  triggers: ["on_pretest_request"],
} as const;

export type PreTestBand = SubjectFamiliarity;

export interface PreTestQuestion {
  prompt: string;
  choices: string[];
  correctIndex: number;
  band: PreTestBand;
}

export interface PreTestPayload {
  subjectId: number;
  subjectName: string;
  questions: PreTestQuestion[];
}

async function loadTopicsFor(subjectId: number): Promise<string[]> {
  try {
    const rows = await db
      .select()
      .from(syllabi)
      .where(eq(syllabi.subjectId, subjectId))
      .orderBy(desc(syllabi.parsedAt))
      .limit(1);
    const row = rows[0];
    if (!row?.topics) return [];
    const parsed = JSON.parse(row.topics) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch (err) {
    console.warn(`[preTest] could not load topics for subject ${subjectId}:`, err);
    return [];
  }
}

function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalize(raw: unknown, subjectName: string): PreTestQuestion[] {
  const obj = (raw ?? {}) as { questions?: unknown };
  const list = Array.isArray(obj.questions) ? obj.questions : [];
  const valid: PreTestQuestion[] = [];
  for (const q of list) {
    if (!q || typeof q !== "object") continue;
    const qq = q as Record<string, unknown>;
    const prompt = typeof qq.prompt === "string" ? qq.prompt : null;
    const choices = Array.isArray(qq.choices)
      ? qq.choices.filter((c): c is string => typeof c === "string")
      : [];
    const correctIndex =
      typeof qq.correctIndex === "number" ? Math.floor(qq.correctIndex) : -1;
    const band = (typeof qq.band === "string" ? qq.band : "familiar") as PreTestBand;
    if (
      !prompt ||
      choices.length < 2 ||
      correctIndex < 0 ||
      correctIndex >= choices.length ||
      !["beginner", "familiar", "confident"].includes(band)
    ) {
      continue;
    }
    valid.push({ prompt, choices, correctIndex, band });
  }
  if (valid.length === 0) {
    return [
      {
        prompt: `Have you studied ${subjectName} before?`,
        choices: [
          "Never — totally new to me",
          "Briefly, in passing",
          "Yes, in a structured class",
          "Yes, and I'd say I'm comfortable with it",
        ],
        correctIndex: 3,
        band: "confident",
      },
    ];
  }
  return valid.slice(0, 5);
}

export async function generatePreTest(subjectId: number): Promise<PreTestPayload> {
  const subject = await getSubject(subjectId);
  if (!subject) throw new Error(`subject ${subjectId} not found`);
  const topics = await loadTopicsFor(subjectId);
  console.log(
    `[preTest] generating for subject "${subject.name}" (id=${subjectId}, topics=${topics.length})`,
  );

  const topicLine =
    topics.length > 0
      ? `Topics from the syllabus: ${topics.slice(0, 30).join(", ")}.`
      : "No syllabus topics available — use general subject knowledge.";

  const userPrompt = `Subject: ${subject.name}
${topicLine}

Write 3-5 casual familiarity-check questions per the rules. Return only the JSON object.`;

  const { text: raw, provider } = await generate({
    slot: "pretest",
    system: preTestAgent.instructions,
    prompt: userPrompt,
    json: true,
  });
  console.log(`[preTest] raw via ${provider} (${raw.length} chars):`, raw.slice(0, 400));

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch (err) {
    console.warn(`[preTest] JSON parse failed, returning fallback:`, err);
    parsed = null;
  }

  const questions = normalize(parsed, subject.name);
  return { subjectId, subjectName: subject.name, questions };
}

export function scorePreTest(
  questions: PreTestQuestion[],
  answers: Array<{ questionIndex: number; choiceIndex: number }>,
): SubjectFamiliarity {
  if (questions.length === 0) return "beginner";

  const weights: Record<PreTestBand, number> = {
    beginner: 1,
    familiar: 2,
    confident: 3,
  };
  let earned = 0;
  let possible = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    possible += weights[q.band];
    const ans = answers.find((a) => a.questionIndex === i);
    if (ans && ans.choiceIndex === q.correctIndex) {
      earned += weights[q.band];
    }
  }
  if (possible === 0) return "beginner";
  const ratio = earned / possible;
  if (ratio >= 0.75) return "confident";
  if (ratio >= 0.4) return "familiar";
  return "beginner";
}
