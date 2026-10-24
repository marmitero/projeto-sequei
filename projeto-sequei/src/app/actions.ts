"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, foodLogs, waterLogs, workoutLogs, metrics, type WorkoutExercise } from "@/db/schema";
import { COOKIE, getUserId } from "@/lib/session";
import type { Profile } from "@/lib/calc";
import { FOOD_MAP, macrosFor } from "@/lib/foods";
import { RECIPES, recipeNutrition } from "@/lib/recipes";
import { CARDIO, EQUIPMENT_LABELS, INJURY_LABELS } from "@/lib/exercises";

async function requireUser() {
  const id = await getUserId();
  if (!id) throw new Error("Perfil não encontrado");
  return id;
}

function done() {
  revalidatePath("/", "layout");
}

const num = (v: unknown, min: number, max: number, def: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, min), max);
};
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

// Whitelists de campos enumerados — valores fora da lista caem no padrão.
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], def: T): T => (allowed.includes(v as T) ? (v as T) : def);
const keysOf = (v: unknown, allowed: readonly string[]) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && allowed.includes(x)))].slice(0, 20) : [];

const GOALS = ["perder", "manter", "ganhar", "recomp"] as const;
const PACES = ["leve", "moderado", "agressivo"] as const;
const ACTIVITY_LEVELS = ["sedentario", "leve", "moderado", "intenso", "atleta"] as const;
const EXPERIENCES = ["iniciante", "intermediario", "avancado"] as const;
const LOCATIONS = ["academia", "casa", "ar_livre"] as const;
const DIETS = ["onivoro", "vegetariano", "vegano", "pescetariano"] as const;
const CARB_APPROACHES = ["equilibrado", "lowcarb", "cetogenica"] as const;
const TRAINING_TIMES = ["manha", "tarde", "noite"] as const;
const CLIMATES = ["temperado", "quente", "frio"] as const;
const RESTRICTIONS = ["lactose", "gluten", "oleaginosas", "amendoim", "ovo", "frutos_do_mar", "soja"] as const;
const CONDITIONS = ["diabetes", "hipertensao", "colesterol", "hipotireoidismo", "renal", "gestante", "lactante"] as const;
const WORKOUT_KINDS = ["forca", "cardio", "mobilidade", "esporte"] as const;

export async function saveProfile(data: Profile) {
  const values = {
    name: String(data.name).slice(0, 60).trim() || "Atleta",
    sex: data.sex === "F" ? "F" : "M",
    birthDate: isDate(data.birthDate) ? data.birthDate : "1995-01-01",
    heightCm: num(data.heightCm, 120, 230, 170),
    weightKg: num(data.weightKg, 30, 300, 70),
    targetWeightKg: num(data.targetWeightKg, 30, 300, 70),
    goal: oneOf(data.goal, GOALS, "perder"),
    pace: oneOf(data.pace, PACES, "moderado"),
    activityLevel: oneOf(data.activityLevel, ACTIVITY_LEVELS, "leve"),
    experience: oneOf(data.experience, EXPERIENCES, "iniciante"),
    trainingDays: Math.round(num(data.trainingDays, 1, 7, 3)),
    sessionMinutes: Math.round(num(data.sessionMinutes, 15, 180, 60)),
    location: oneOf(data.location, LOCATIONS, "academia"),
    equipment: keysOf(data.equipment, Object.keys(EQUIPMENT_LABELS)),
    cardioPrefs: keysOf(data.cardioPrefs, Object.keys(CARDIO)),
    injuries: keysOf(data.injuries, Object.keys(INJURY_LABELS)),
    diet: oneOf(data.diet, DIETS, "onivoro"),
    carbApproach: oneOf(data.carbApproach, CARB_APPROACHES, "equilibrado"),
    restrictions: keysOf(data.restrictions, RESTRICTIONS),
    dislikes: String(data.dislikes ?? "").slice(0, 300),
    healthConditions: keysOf(data.healthConditions, CONDITIONS),
    mealsPerDay: Math.round(num(data.mealsPerDay, 3, 6, 5)),
    wakeTime: isTime(data.wakeTime) ? data.wakeTime : "07:00",
    sleepTime: isTime(data.sleepTime) ? data.sleepTime : "23:00",
    trainingTime: oneOf(data.trainingTime, TRAINING_TIMES, "noite"),
    climate: oneOf(data.climate, CLIMATES, "temperado"),
    timezone: data.timezone || "America/Sao_Paulo",
    updatedAt: new Date(),
  };
  const existing = await getUserId();
  let id = existing;
  if (existing) {
    const r = await db.update(users).set(values).where(eq(users.id, existing)).returning({ id: users.id });
    if (!r.length) id = null;
  }
  if (!id) {
    const r = await db.insert(users).values(values).returning({ id: users.id });
    id = r[0].id;
  }
  const store = await cookies();
  store.set(COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 * 2 });
  done();
  return { ok: true };
}

export async function resetAccount() {
  const id = await getUserId();
  if (id) await db.delete(users).where(eq(users.id, id));
  const store = await cookies();
  store.delete(COOKIE);
  done();
}

// ---------- Alimentação ----------
export type FoodEntryInput = {
  date: string;
  meal: string;
  foodKey?: string;
  recipeKey?: string;
  servings?: number;
  grams?: number;
  portionLabel?: string;
  custom?: { name: string; kcal: number; protein: number; carbs: number; fat: number; fiber?: number };
};

function buildEntry(userId: string, e: FoodEntryInput) {
  if (!isDate(e.date)) throw new Error("Data inválida");
  const base = { userId, date: e.date, meal: e.meal, portionLabel: (e.portionLabel ?? "").slice(0, 80) };
  if (e.foodKey) {
    const f = FOOD_MAP[e.foodKey];
    if (!f) throw new Error("Alimento não encontrado");
    const grams = num(e.grams, 1, 3000, 100);
    return { ...base, foodKey: f.key, name: f.name, grams, ...macrosFor(f, grams) };
  }
  if (e.recipeKey) {
    const r = RECIPES.find((x) => x.key === e.recipeKey);
    if (!r) throw new Error("Receita não encontrada");
    const n = recipeNutrition(r);
    const s = num(e.servings, 0.25, 10, 1);
    return {
      ...base,
      recipeKey: r.key,
      name: r.name,
      grams: Math.round(n.gramsPerServing * s),
      portionLabel: `${String(s).replace(".", ",")} porção(ões)`,
      kcal: Math.round(n.kcal * s),
      protein: +(n.protein * s).toFixed(1),
      carbs: +(n.carbs * s).toFixed(1),
      fat: +(n.fat * s).toFixed(1),
      fiber: +(n.fiber * s).toFixed(1),
    };
  }
  if (e.custom) {
    return {
      ...base,
      name: e.custom.name.slice(0, 80) || "Alimento",
      grams: num(e.grams, 0, 3000, 0),
      kcal: num(e.custom.kcal, 0, 5000, 0),
      protein: num(e.custom.protein, 0, 500, 0),
      carbs: num(e.custom.carbs, 0, 1000, 0),
      fat: num(e.custom.fat, 0, 500, 0),
      fiber: num(e.custom.fiber, 0, 200, 0),
    };
  }
  throw new Error("Entrada inválida");
}

export async function addFoodEntries(entries: FoodEntryInput[]) {
  const userId = await requireUser();
  if (!entries.length) return;
  await db.insert(foodLogs).values(entries.slice(0, 30).map((e) => buildEntry(userId, e)));
  done();
}

export async function deleteFoodEntry(id: number) {
  const userId = await requireUser();
  await db.delete(foodLogs).where(and(eq(foodLogs.id, id), eq(foodLogs.userId, userId)));
  done();
}

// ---------- Hidratação ----------
export async function addWater(date: string, ml: number) {
  const userId = await requireUser();
  if (!isDate(date)) return;
  await db.insert(waterLogs).values({ userId, date, ml: Math.round(num(ml, 10, 3000, 250)) });
  done();
}

export async function deleteWater(id: number) {
  const userId = await requireUser();
  await db.delete(waterLogs).where(and(eq(waterLogs.id, id), eq(waterLogs.userId, userId)));
  done();
}

// ---------- Treinos ----------
export async function logWorkout(input: {
  date: string;
  title: string;
  kind: string;
  durationMin: number;
  kcal: number;
  effort: number;
  exercises: WorkoutExercise[];
  notes?: string;
}) {
  const userId = await requireUser();
  if (!isDate(input.date)) return;
  await db.insert(workoutLogs).values({
    userId,
    date: input.date,
    title: input.title.slice(0, 80) || "Treino",
    kind: oneOf(input.kind, WORKOUT_KINDS, "forca"),
    durationMin: Math.round(num(input.durationMin, 1, 600, 45)),
    kcal: Math.round(num(input.kcal, 0, 5000, 0)),
    effort: Math.round(num(input.effort, 1, 10, 6)),
    exercises: (input.exercises ?? []).slice(0, 20),
    notes: (input.notes ?? "").slice(0, 500),
  });
  done();
}

export async function deleteWorkout(id: number) {
  const userId = await requireUser();
  await db.delete(workoutLogs).where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId)));
  done();
}

// ---------- Métricas ----------
export type MetricInput = {
  date: string;
  weightKg?: number | null;
  bodyFatPct?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
  neckCm?: number | null;
  chestCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
  restingHr?: number | null;
  sleepHours?: number | null;
  notes?: string;
};

const opt = (v: unknown, min: number, max: number) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

export async function saveMetric(m: MetricInput) {
  const userId = await requireUser();
  if (!isDate(m.date)) return;
  const values = {
    weightKg: opt(m.weightKg, 30, 300),
    bodyFatPct: opt(m.bodyFatPct, 2, 70),
    waistCm: opt(m.waistCm, 40, 250),
    hipCm: opt(m.hipCm, 40, 250),
    neckCm: opt(m.neckCm, 20, 70),
    chestCm: opt(m.chestCm, 50, 200),
    armCm: opt(m.armCm, 15, 80),
    thighCm: opt(m.thighCm, 25, 120),
    restingHr: opt(m.restingHr, 30, 140) === null ? null : Math.round(Number(m.restingHr)),
    sleepHours: opt(m.sleepHours, 0, 16),
    notes: (m.notes ?? "").slice(0, 300),
  };
  await db
    .insert(metrics)
    .values({ userId, date: m.date, ...values })
    .onConflictDoUpdate({ target: [metrics.userId, metrics.date], set: values });

  // Peso mais recente atualiza o perfil → metas recalculadas automaticamente
  if (values.weightKg) {
    const latest = await db.select({ date: metrics.date, w: metrics.weightKg }).from(metrics).where(eq(metrics.userId, userId));
    const withW = latest.filter((x) => x.w).sort((a, b) => b.date.localeCompare(a.date));
    if (withW[0]?.w) await db.update(users).set({ weightKg: withW[0].w, updatedAt: new Date() }).where(eq(users.id, userId));
  }
  done();
}

export async function deleteMetric(id: number) {
  const userId = await requireUser();
  await db.delete(metrics).where(and(eq(metrics.id, id), eq(metrics.userId, userId)));
  done();
}
