import "server-only";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { foodLogs, waterLogs, workoutLogs, metrics } from "@/db/schema";
import { getUser, toProfile } from "./session";
import { computeTargets, todayIn } from "./calc";

export async function getContext() {
  const user = await getUser();
  if (!user) redirect("/onboarding");
  const profile = toProfile(user);
  const targets = computeTargets(profile);
  const today = todayIn(user.timezone);
  return { user, profile, targets, today };
}

export function foodsOn(userId: string, date: string) {
  return db.select().from(foodLogs).where(and(eq(foodLogs.userId, userId), eq(foodLogs.date, date))).orderBy(asc(foodLogs.createdAt));
}

export function foodsBetween(userId: string, from: string, to: string) {
  return db.select().from(foodLogs).where(and(eq(foodLogs.userId, userId), gte(foodLogs.date, from), lte(foodLogs.date, to)));
}

export function waterBetween(userId: string, from: string, to: string) {
  return db.select().from(waterLogs).where(and(eq(waterLogs.userId, userId), gte(waterLogs.date, from), lte(waterLogs.date, to))).orderBy(desc(waterLogs.createdAt));
}

export function workoutsBetween(userId: string, from: string, to: string) {
  return db.select().from(workoutLogs).where(and(eq(workoutLogs.userId, userId), gte(workoutLogs.date, from), lte(workoutLogs.date, to))).orderBy(desc(workoutLogs.date), desc(workoutLogs.createdAt));
}

export function allMetrics(userId: string) {
  return db.select().from(metrics).where(eq(metrics.userId, userId)).orderBy(asc(metrics.date));
}

export function sumMacros(rows: { kcal: number; protein: number; carbs: number; fat: number; fiber: number }[]) {
  return rows.reduce(
    (a, r) => ({ kcal: a.kcal + r.kcal, protein: a.protein + r.protein, carbs: a.carbs + r.carbs, fat: a.fat + r.fat, fiber: a.fiber + r.fiber }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}
