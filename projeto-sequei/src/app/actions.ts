"use server";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getT } from "@/lib/i18n-server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts, foodLogs, waterLogs, workoutLogs, metrics, customFoods, favorites, communityRecipes, communityRecipeLikes, planShares, type WorkoutExercise } from "@/db/schema";
import { COOKIE, getUserId, getUser, getSessionAccount, startSession, endSession, authCookieOpts } from "@/lib/session";
import type { Profile } from "@/lib/calc";
import { FOOD_MAP, macrosFor } from "@/lib/foods";
import { RECIPES, recipeNutrition } from "@/lib/recipes";
import { CARDIO, EQUIPMENT_LABELS, INJURY_LABELS } from "@/lib/exercises";
import { hashPassword, verifyPassword, validatePassword, normalizeEmail, isValidEmail } from "@/lib/password";
import { rateLimit } from "@/lib/ratelimit";
import { mapOpenFoodFacts } from "@/lib/barcode";
import { normalizeRecipeInput } from "@/lib/community";

async function requireUser() {  const t = await getT();

  const user = await getUser();
  if (!user) throw new Error(t("err.profileNotFound"));
  return user.id;
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

function profileValues(data: Profile) {
  return {
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
}

export async function saveProfile(data: Profile): Promise<{ ok: boolean; id: string }> {
  const account = await getSessionAccount();
  const values = { ...profileValues(data), ...(account ? { accountId: account.id } : {}) };
  const current = await getUser();
  let id = current?.id ?? null;
  if (id) {
    const r = await db.update(users).set(values).where(eq(users.id, id)).returning({ id: users.id });
    if (!r.length) id = null;
  }
  if (!id) {
    const r = await db.insert(users).values(values).returning({ id: users.id });
    id = r[0].id;
  }
  const store = await cookies();
  store.set(COOKIE, id, await authCookieOpts(60 * 60 * 24 * 365 * 2));
  done();
  return { ok: true, id };
}

async function clientKey(prefix: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return `${prefix}:${ip}`;
}

export async function registerAccount(email: string, password: string): Promise<{ ok: boolean; error?: string; fituid?: string | null; session?: string }> {
  const t = await getT();
  const mail = normalizeEmail(email);
  if (!isValidEmail(mail)) return { ok: false, error: t("auth.invalidEmail") };
  const pwdError = validatePassword(password);
  if (pwdError) return { ok: false, error: pwdError };
  const ipKey = await clientKey("register");
  if (!rateLimit(`register:${mail}`, 3, 10 * 60_000) || !rateLimit(ipKey, 30, 10 * 60_000)) {
    return { ok: false, error: t("auth.rateLimited") };
  }
  const existing = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.email, mail)).limit(1);
  if (existing.length) return { ok: false, error: t("auth.emailTaken") };

  const r = await db.insert(accounts).values({ email: mail, passwordHash: hashPassword(password) }).returning({ id: accounts.id });
  const accountId = r[0].id;

  // Reivindica o perfil anônimo deste navegador, se existir
  const anonId = await getUserId();
  if (anonId) {
    await db
      .update(users)
      .set({ accountId, updatedAt: new Date() })
      .where(and(eq(users.id, anonId), isNull(users.accountId)));
  }
  const session = await startSession(accountId);
  done();
  return { ok: true, fituid: anonId ?? (await getUserId()), session };
}

export async function loginAccount(email: string, password: string): Promise<{ ok: boolean; error?: string; fituid?: string | null; session?: string }> {
  const t = await getT();
  const mail = normalizeEmail(email);
  const ipKey = await clientKey("login");
  if (!rateLimit(`login:${mail}`, 10, 5 * 60_000) || !rateLimit(ipKey, 60, 5 * 60_000)) {
    return { ok: false, error: t("auth.rateLimited") };
  }
  const rows = await db.select().from(accounts).where(eq(accounts.email, mail)).limit(1);
  const account = rows[0];
  if (!account || !verifyPassword(String(password ?? ""), account.passwordHash)) {
    return { ok: false, error: t("auth.badCredentials") };
  }
  const session = await startSession(account.id);

  // Sincroniza o cookie de perfil com o perfil da conta (se já existir)
  const profile = await db.select({ id: users.id }).from(users).where(eq(users.accountId, account.id)).limit(1);
  const store = await cookies();
  if (profile[0]) {
    store.set(COOKIE, profile[0].id, await authCookieOpts(60 * 60 * 24 * 365 * 2));
  } else {
    // conta nova sem perfil: reivindica o perfil anônimo deste navegador, se houver
    const anonId = await getUserId();
    if (anonId) {
      await db
        .update(users)
        .set({ accountId: account.id, updatedAt: new Date() })
        .where(and(eq(users.id, anonId), isNull(users.accountId)));
    }
  }
  done();
  return { ok: true, fituid: profile[0]?.id ?? (await getUserId()), session };
}

export async function logoutAccount() {
  await endSession();
  done();
}

export async function resetAccount() {
  const t = await getT();
  const user = await getUser();
  if (user) await db.delete(users).where(eq(users.id, user.id));
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
  customId?: number;
  servings?: number;
  grams?: number;
  portionLabel?: string;
  custom?: { name: string; kcal: number; protein: number; carbs: number; fat: number; fiber?: number };
};

function buildEntry(userId: string, e: FoodEntryInput, t: (k: string) => string) {

  if (!isDate(e.date)) throw new Error(t("err.invalidDate"));
  const base = { userId, date: e.date, meal: e.meal, portionLabel: (e.portionLabel ?? "").slice(0, 80) };
  if (e.customId) {
    // resolvido em addFoodEntries (precisa de query); nunca chega aqui sozinho
    throw new Error(t("err.invalidInput"));
  }
  if (e.foodKey) {
    const f = FOOD_MAP[e.foodKey];
    if (!f) throw new Error(t("err.foodNotFound"));
    const grams = num(e.grams, 1, 3000, 100);
    return { ...base, foodKey: f.key, name: f.name, grams, ...macrosFor(f, grams) };
  }
  if (e.recipeKey) {
    const r = RECIPES.find((x) => x.key === e.recipeKey);
    if (!r) throw new Error(t("err.recipeNotFound"));
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
  throw new Error(t("err.invalidInput"));
}

export async function addFoodEntries(entries: FoodEntryInput[]) {
  const t = await getT();
  const userId = await requireUser();
  const list = entries.slice(0, 30);
  if (!list.length) return;
  const customIds = [...new Set(list.map((e) => e.customId).filter((x): x is number => !!x))];
  const customMap = new Map<number, { name: string; grams: number; portionLabel: string; kcal: number; protein: number; carbs: number; fat: number; fiber: number }>();
  if (customIds.length) {
    const rows = await db.select().from(customFoods).where(and(eq(customFoods.userId, userId), inArray(customFoods.id, customIds)));
    for (const r of rows) customMap.set(r.id, r);
  }
  const values = list.map((e) => {
    if (e.customId) {
      const c = customMap.get(e.customId);
      if (!c) throw new Error(t("err.foodNotFound"));
      if (!isDate(e.date)) throw new Error(t("err.invalidDate"));
      const s = num(e.servings, 0.25, 20, 1);
      return {
        userId,
        date: e.date,
        meal: e.meal,
        portionLabel: (e.portionLabel ?? (c.portionLabel || `${c.grams} g`)).slice(0, 80),
        name: c.name,
        grams: Math.round(c.grams * s),
        kcal: Math.round(c.kcal * s),
        protein: +(c.protein * s).toFixed(1),
        carbs: +(c.carbs * s).toFixed(1),
        fat: +(c.fat * s).toFixed(1),
        fiber: +(c.fiber * s).toFixed(1),
      };
    }
    return buildEntry(userId, e, t);
  });
  await db.insert(foodLogs).values(values);
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

// ---------- Backup: importação (JSON gerado pelo /api/export) ----------
export type ImportPayload = {
  profile?: Profile;
  foodLogs?: { date: string; meal: string; name: string; grams: number; portionLabel?: string; kcal: number; protein: number; carbs: number; fat: number; fiber?: number }[];
  waterLogs?: { date: string; ml: number }[];
  workoutLogs?: { date: string; title: string; kind: string; durationMin: number; kcal: number; effort?: number; exercises?: WorkoutExercise[]; notes?: string }[];
  metrics?: MetricInput[];
};

export async function importData(payload: ImportPayload): Promise<{ ok: boolean; error?: string; imported?: Record<string, number> }> {
  const t = await getT();
  const userId = await requireUser();
  const key = await clientKey("import");
  if (!rateLimit(key, 10, 60_000)) return { ok: false, error: "Muitas importações. Aguarde um pouco." };
  if (!payload || typeof payload !== "object") return { ok: false, error: t("err.invalidFile") };

  const imported: Record<string, number> = {};
  const cap = <T>(a: T[] | undefined) => (Array.isArray(a) ? a.slice(0, 5000) : []);

  if (payload.profile) {
    await db.update(users).set(profileValues(payload.profile)).where(eq(users.id, userId));
    imported.profile = 1;
  }

  const foods = cap(payload.foodLogs).filter((e) => isDate(String(e?.date)));
  if (foods.length) {
    await db.insert(foodLogs).values(
      foods.map((e) => ({
        userId,
        date: e.date,
        meal: String(e.meal || "almoco"),
        name: String(e.name || "Alimento").slice(0, 80),
        grams: num(e.grams, 0, 3000, 0),
        portionLabel: String(e.portionLabel ?? "").slice(0, 80),
        kcal: num(e.kcal, 0, 5000, 0),
        protein: num(e.protein, 0, 500, 0),
        carbs: num(e.carbs, 0, 1000, 0),
        fat: num(e.fat, 0, 500, 0),
        fiber: num(e.fiber, 0, 200, 0),
      })),
    );
    imported.foodLogs = foods.length;
  }

  const waters = cap(payload.waterLogs).filter((w) => isDate(String(w?.date)));
  if (waters.length) {
    await db.insert(waterLogs).values(waters.map((w) => ({ userId, date: w.date, ml: Math.round(num(w.ml, 10, 3000, 250)) })));
    imported.waterLogs = waters.length;
  }

  const workouts = cap(payload.workoutLogs).filter((w) => isDate(String(w?.date)));
  if (workouts.length) {
    await db.insert(workoutLogs).values(
      workouts.map((w) => ({
        userId,
        date: w.date,
        title: String(w.title || "Treino").slice(0, 80),
        kind: oneOf(w.kind, WORKOUT_KINDS, "forca"),
        durationMin: Math.round(num(w.durationMin, 1, 600, 45)),
        kcal: Math.round(num(w.kcal, 0, 5000, 0)),
        effort: Math.round(num(w.effort, 1, 10, 6)),
        exercises: (w.exercises ?? []).slice(0, 20),
        notes: String(w.notes ?? "").slice(0, 500),
      })),
    );
    imported.workoutLogs = workouts.length;
  }

  const ms = cap(payload.metrics).filter((m) => isDate(String(m?.date)));
  if (ms.length) {
    for (const m of ms) {
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
        notes: String(m.notes ?? "").slice(0, 300),
      };
      await db
        .insert(metrics)
        .values({ userId, date: m.date, ...values })
        .onConflictDoUpdate({ target: [metrics.userId, metrics.date], set: values });
    }
    imported.metrics = ms.length;
  }

  done();
  return { ok: true, imported };
}

// ---------- Meus alimentos, favoritos e atalhos ----------
export type CustomFoodInput = {
  id?: number;
  name: string;
  grams: number;
  portionLabel?: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
};

export async function saveCustomFood(input: CustomFoodInput): Promise<{ ok: boolean; id?: number; error?: string }> {
  const t = await getT();
  const userId = await requireUser();
  const values = {
    name: String(input.name ?? "").slice(0, 80).trim() || "Alimento",
    grams: num(input.grams, 1, 3000, 100),
    portionLabel: String(input.portionLabel ?? "").slice(0, 80),
    kcal: num(input.kcal, 0, 5000, 0),
    protein: num(input.protein, 0, 500, 0),
    carbs: num(input.carbs, 0, 1000, 0),
    fat: num(input.fat, 0, 500, 0),
    fiber: num(input.fiber, 0, 200, 0),
  };
  if (input.id) {
    const r = await db
      .update(customFoods)
      .set(values)
      .where(and(eq(customFoods.id, input.id), eq(customFoods.userId, userId)))
      .returning({ id: customFoods.id });
    if (!r.length) return { ok: false, error: t("err.foodNotFound") };
    done();
    return { ok: true, id: r[0].id };
  }
  const r = await db.insert(customFoods).values({ userId, ...values }).returning({ id: customFoods.id });
  done();
  return { ok: true, id: r[0].id };
}

export async function deleteCustomFood(id: number) {
  const userId = await requireUser();
  await db.delete(customFoods).where(and(eq(customFoods.id, id), eq(customFoods.userId, userId)));
  await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.kind, "custom"), eq(favorites.key, String(id))));
  done();
}

export async function toggleFavorite(kind: string, key: string): Promise<{ ok: boolean; favorited: boolean }> {
  const userId = await requireUser();
  const k = oneOf(kind, ["food", "recipe", "custom"] as const, "food");
  const id = String(key ?? "").slice(0, 64);
  if (!id) return { ok: false, favorited: false };
  const existing = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.kind, k), eq(favorites.key, id)))
    .limit(1);
  if (existing.length) {
    await db.delete(favorites).where(eq(favorites.id, existing[0].id));
    done();
    return { ok: true, favorited: false };
  }
  await db.insert(favorites).values({ userId, kind: k, key: id });
  done();
  return { ok: true, favorited: true };
}

/** Copia os registros de uma refeição de outra data (ex.: "repetir ontem"). */
export async function copyMeal(fromDate: string, toDate: string, meal: string): Promise<{ ok: boolean; copied: number }> {
  const userId = await requireUser();
  if (!isDate(fromDate) || !isDate(toDate)) return { ok: false, copied: 0 };
  const rows = await db
    .select()
    .from(foodLogs)
    .where(and(eq(foodLogs.userId, userId), eq(foodLogs.date, fromDate), eq(foodLogs.meal, meal)));
  if (!rows.length) {
    done();
    return { ok: true, copied: 0 };
  }
  await db.insert(foodLogs).values(
    rows.map((r) => ({
      userId,
      date: toDate,
      meal: r.meal,
      foodKey: r.foodKey,
      recipeKey: r.recipeKey,
      name: r.name,
      grams: r.grams,
      portionLabel: r.portionLabel,
      kcal: r.kcal,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fat,
      fiber: r.fiber,
    })),
  );
  done();
  return { ok: true, copied: rows.length };
}

// ---------- Código de barras (Open Food Facts) ----------
export async function lookupBarcode(code: string): Promise<{ ok: boolean; error?: string; product?: { name: string; kcal: number; protein: number; carbs: number; fat: number; fiber: number } }> {
  const t = await getT();
  await requireUser();
  const c = String(code ?? "").trim();
  if (!/^\d{6,14}$/.test(c)) return { ok: false, error: t("err.badBarcode") };
  const key = await clientKey("barcode");
  if (!rateLimit(key, 30, 60_000)) return { ok: false, error: t("err.rateLimitedApi") };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${c}.json?fields=product_name,brands,nutriments`, {
      signal: ctrl.signal,
      headers: { "User-Agent": "FitVida/0.1 (acompanhamento fitness)" },
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, error: t("err.productNotFound") };
    const product = mapOpenFoodFacts(await res.json());
    if (!product) return { ok: false, error: t("err.productNoNutrition") };
    return { ok: true, product };
  } catch {
    return { ok: false, error: t("err.apiUnavailable") };
  }
}

export type LibraryData = {
  custom: { id: number; name: string; grams: number; portionLabel: string; kcal: number; protein: number; carbs: number; fat: number; fiber: number }[];
  favs: { kind: string; key: string }[];
};

export async function listLibrary(): Promise<LibraryData> {
  const userId = await requireUser();
  const [custom, favs] = await Promise.all([
    db.select().from(customFoods).where(eq(customFoods.userId, userId)),
    db.select({ kind: favorites.kind, key: favorites.key }).from(favorites).where(eq(favorites.userId, userId)),
  ]);
  return {
    custom: custom.map((c) => ({
      id: c.id,
      name: c.name,
      grams: c.grams,
      portionLabel: c.portionLabel,
      kcal: c.kcal,
      protein: c.protein,
      carbs: c.carbs,
      fat: c.fat,
      fiber: c.fiber,
    })),
    favs,
  };
}

// ───────────────────────────── Fase 4 — Escala ─────────────────────────────

/** Receitas da comunidade */
export async function submitCommunityRecipe(input: {
  name: string;
  description?: string;
  ingredientsText?: string;
  steps?: string;
  tagsText?: string;
  kcal: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}): Promise<{ ok: boolean; id?: number; error?: string }> {
  const userId = await requireUser();
  const parsed = normalizeRecipeInput(input);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  const r = await db.insert(communityRecipes).values({ userId, ...parsed }).returning({ id: communityRecipes.id });
  return { ok: true, id: r[0].id };
}

export async function toggleCommunityLike(recipeId: number): Promise<{ ok: boolean; liked: boolean }> {
  const userId = await requireUser();
  const existing = await db
    .select({ recipeId: communityRecipeLikes.recipeId })
    .from(communityRecipeLikes)
    .where(and(eq(communityRecipeLikes.recipeId, recipeId), eq(communityRecipeLikes.userId, userId)))
    .limit(1);
  if (existing.length) {
    await db.delete(communityRecipeLikes).where(and(eq(communityRecipeLikes.recipeId, recipeId), eq(communityRecipeLikes.userId, userId)));
    return { ok: true, liked: false };
  }
  await db.insert(communityRecipeLikes).values({ recipeId, userId });
  return { ok: true, liked: true };
}

export async function deleteCommunityRecipe(id: number): Promise<{ ok: boolean }> {
  const userId = await requireUser();
  await db.delete(communityRecipes).where(and(eq(communityRecipes.id, id), eq(communityRecipes.userId, userId)));
  return { ok: true };
}

/** Planos compartilhados (link somente-leitura) */
export async function createShare(label?: string): Promise<{ ok: boolean; id?: number; token?: string; error?: string }> {
  const userId = await requireUser();
  const token = randomBytes(16).toString("hex");
  const r = await db.insert(planShares).values({ userId, token, label: (label ?? "").trim().slice(0, 60) }).returning({ id: planShares.id });
  return { ok: true, id: r[0].id, token };
}

export async function revokeShare(id: number): Promise<{ ok: boolean }> {
  const userId = await requireUser();
  await db.update(planShares).set({ revokedAt: new Date() }).where(and(eq(planShares.id, id), eq(planShares.userId, userId), isNull(planShares.revokedAt)));
  return { ok: true };
}

/** Ajuste inteligente/manual de metas (overrides sobre o cálculo automático) */
export async function applyTargetOverrides(partial: { kcal?: number; water?: number; protein?: number; carbs?: number; fat?: number; fiber?: number }): Promise<{ ok: boolean }> {
  const userId = await requireUser();
  const me = await getUser();
  const current = ((me?.targetOverrides ?? {}) as Record<string, number>);
  const next = { ...current };
  for (const [k, v] of Object.entries(partial)) {
    if (typeof v === "number" && Number.isFinite(v)) next[k] = v;
    else delete next[k];
  }
  await db.update(users).set({ targetOverrides: next }).where(eq(users.id, userId));
  done();
  return { ok: true };
}

export async function clearTargetOverrides(): Promise<{ ok: boolean }> {
  const userId = await requireUser();
  await db.update(users).set({ targetOverrides: null }).where(eq(users.id, userId));
  done();
  return { ok: true };
}
