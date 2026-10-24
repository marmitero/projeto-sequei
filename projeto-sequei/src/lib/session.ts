import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import type { Profile } from "./calc";

export const COOKIE = "fituid";

export async function getUserId(): Promise<string | null> {
  const store = await cookies();
  const id = store.get(COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return id;
}

export async function getUser(): Promise<User | null> {
  const id = await getUserId();
  if (!id) return null;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export function toProfile(u: User): Profile {
  return {
    name: u.name,
    sex: u.sex,
    birthDate: u.birthDate,
    heightCm: u.heightCm,
    weightKg: u.weightKg,
    targetWeightKg: u.targetWeightKg,
    goal: u.goal,
    pace: u.pace,
    activityLevel: u.activityLevel,
    experience: u.experience,
    trainingDays: u.trainingDays,
    sessionMinutes: u.sessionMinutes,
    location: u.location,
    equipment: u.equipment,
    cardioPrefs: u.cardioPrefs,
    injuries: u.injuries,
    diet: u.diet,
    carbApproach: u.carbApproach,
    restrictions: u.restrictions,
    dislikes: u.dislikes,
    healthConditions: u.healthConditions,
    mealsPerDay: u.mealsPerDay,
    wakeTime: u.wakeTime,
    sleepTime: u.sleepTime,
    trainingTime: u.trainingTime,
    climate: u.climate,
    timezone: u.timezone,
  };
}
