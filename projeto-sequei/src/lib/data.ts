import "server-only";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { foodLogs, waterLogs, workoutLogs, metrics } from "@/db/schema";
import { getUser, toProfile } from "./session";
import { computeTargets, todayIn } from "./calc";
import { clampTargets } from "./goalcoach";

export async function getContext() {
  const user = await getUser();
  if (!user) redirect("/onboarding");
  const profile = toProfile(user);
  const targets = clampTargets(computeTargets(profile), profile.sex, user.targetOverrides);
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

/** Datas agregadas para streaks/marcos (gamificação). */
export async function dailyCounts(userId: string, waterGoalMl: number) {
  const [foods, waters, workouts, ms] = await Promise.all([
    db.select({ date: foodLogs.date }).from(foodLogs).where(eq(foodLogs.userId, userId)).groupBy(foodLogs.date),
    db.select({ date: waterLogs.date, total: sql<number>`sum(${waterLogs.ml})` }).from(waterLogs).where(eq(waterLogs.userId, userId)).groupBy(waterLogs.date),
    db.select({ date: workoutLogs.date }).from(workoutLogs).where(eq(workoutLogs.userId, userId)).groupBy(workoutLogs.date),
    db.select({ date: metrics.date }).from(metrics).where(eq(metrics.userId, userId)).groupBy(metrics.date),
  ]);
  return {
    foodDays: foods.map((f) => f.date),
    waterDays: waters.filter((w) => Number(w.total) >= waterGoalMl * 0.9).map((w) => w.date),
    workoutDays: workouts.map((w) => w.date),
    weighDays: ms.map((m) => m.date),
    workouts: workouts.length,
    waterGoalMl,
  };
}
