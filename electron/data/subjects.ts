import { eq } from "drizzle-orm";
import { db } from "../db";
import { subjects } from "../../src/lib/schema";

export type SubjectFamiliarity = "beginner" | "familiar" | "confident";

export interface Subject {
  id: number;
  name: string;
  educationLevel: string;
  color: string;
  createdAt: Date;
  familiarity: SubjectFamiliarity | null;
}

const PALETTE = [
  "#d97757", // terracotta
  "#3b6e8f", // ink blue
  "#6c8e68", // moss
  "#a86b8a", // dusk plum
  "#b89456", // honey
  "#5b6f9e", // slate blue
  "#8c5e3c", // walnut
  "#4f7f6f", // pine
];

export function pickColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

function narrowFamiliarity(value: string | null): SubjectFamiliarity | null {
  return value === "beginner" || value === "familiar" || value === "confident"
    ? value
    : null;
}

function toSubject(row: {
  id: number;
  name: string;
  educationLevel: string;
  color: string;
  createdAt: Date;
  familiarity: string | null;
}): Subject {
  return { ...row, familiarity: narrowFamiliarity(row.familiarity) };
}

export async function listSubjects(): Promise<Subject[]> {
  const rows = await db.select().from(subjects).orderBy(subjects.createdAt);
  return rows.map(toSubject);
}

export async function createSubject(input: {
  name: string;
  educationLevel: string;
  color?: string;
}): Promise<Subject> {
  const existing = await listSubjects();
  const color = input.color ?? pickColor(existing.length);
  const [row] = await db
    .insert(subjects)
    .values({
      name: input.name,
      educationLevel: input.educationLevel,
      color,
      createdAt: new Date(),
    })
    .returning();
  return toSubject(row);
}

export async function updateSubject(
  id: number,
  patch: Partial<{ name: string; color: string }>,
): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  await db.update(subjects).set(patch).where(eq(subjects.id, id));
}

export async function setSubjectFamiliarity(
  id: number,
  level: SubjectFamiliarity | null,
): Promise<void> {
  await db
    .update(subjects)
    .set({ familiarity: level })
    .where(eq(subjects.id, id));
}

export async function deleteSubject(id: number): Promise<void> {
  await db.delete(subjects).where(eq(subjects.id, id));
}

export async function getSubject(id: number): Promise<Subject | null> {
  const rows = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
  return rows[0] ? toSubject(rows[0]) : null;
}
