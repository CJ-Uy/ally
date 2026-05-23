import { eq } from "drizzle-orm";
import { db } from "../db";
import { subjects } from "../../src/lib/schema";

export interface Subject {
  id: number;
  name: string;
  educationLevel: string;
  color: string;
  createdAt: Date;
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

export async function listSubjects(): Promise<Subject[]> {
  return db.select().from(subjects).orderBy(subjects.createdAt);
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
  return row;
}

export async function updateSubject(
  id: number,
  patch: Partial<{ name: string; color: string }>,
): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  await db.update(subjects).set(patch).where(eq(subjects.id, id));
}

export async function deleteSubject(id: number): Promise<void> {
  await db.delete(subjects).where(eq(subjects.id, id));
}

export async function getSubject(id: number): Promise<Subject | null> {
  const rows = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
  return rows[0] ?? null;
}
