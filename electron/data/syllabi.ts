import { eq } from "drizzle-orm";
import { db } from "../db";
import { syllabi } from "../../src/lib/schema";

export interface Syllabus {
  id: number;
  subjectId: number;
  fileName: string | null;
  parsedAt: Date;
  gradingBreakdown: string | null;
  difficulty: string | null;
  topics: string | null;
  rawSummary: string | null;
}

export interface SyllabusInsert {
  subjectId: number;
  fileName?: string | null;
  gradingBreakdown?: unknown;
  difficulty?: string | null;
  topics?: unknown;
  rawSummary?: string | null;
}

export async function saveSyllabus(input: SyllabusInsert): Promise<Syllabus> {
  const [row] = await db
    .insert(syllabi)
    .values({
      subjectId: input.subjectId,
      fileName: input.fileName ?? null,
      parsedAt: new Date(),
      gradingBreakdown: input.gradingBreakdown
        ? JSON.stringify(input.gradingBreakdown)
        : null,
      difficulty: input.difficulty ?? null,
      topics: input.topics ? JSON.stringify(input.topics) : null,
      rawSummary: input.rawSummary ?? null,
    })
    .returning();
  return row;
}

export async function getSyllabusForSubject(
  subjectId: number,
): Promise<Syllabus | null> {
  const rows = await db
    .select()
    .from(syllabi)
    .where(eq(syllabi.subjectId, subjectId))
    .limit(1);
  return rows[0] ?? null;
}
