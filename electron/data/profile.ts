import { eq } from "drizzle-orm";
import { db } from "../db";
import { userProfile } from "../../src/lib/schema";

export interface UserProfile {
  id: number;
  studyHoursPerWeek: number;
  educationLevel: string;
  onboardedAt: Date;
}

export async function getProfile(): Promise<UserProfile | null> {
  const rows = await db.select().from(userProfile).limit(1);
  return rows[0] ?? null;
}

export async function saveProfile(input: {
  studyHoursPerWeek: number;
  educationLevel: string;
}): Promise<UserProfile> {
  const existing = await getProfile();
  const now = new Date();
  if (existing) {
    await db
      .update(userProfile)
      .set({
        studyHoursPerWeek: input.studyHoursPerWeek,
        educationLevel: input.educationLevel,
      })
      .where(eq(userProfile.id, existing.id));
    return {
      ...existing,
      studyHoursPerWeek: input.studyHoursPerWeek,
      educationLevel: input.educationLevel,
    };
  }

  const [inserted] = await db
    .insert(userProfile)
    .values({
      studyHoursPerWeek: input.studyHoursPerWeek,
      educationLevel: input.educationLevel,
      onboardedAt: now,
    })
    .returning();

  return inserted;
}

export async function clearProfile(): Promise<void> {
  await db.delete(userProfile);
}
