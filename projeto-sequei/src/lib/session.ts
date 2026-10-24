import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { accounts, sessions, users, type Account, type User } from "@/db/schema";
import type { Profile } from "./calc";

export const COOKIE = "fituid";
export const SESSION_COOKIE = "fit_session";
export const SESSION_DAYS = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getUserId(): Promise<string | null> {
  const store = await cookies();
  const id = store.get(COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return id;
}

/** Conta da sessão ativa (cookie `fit_session`), ou null. */
export async function getSessionAccount(): Promise<Account | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ account: accounts })
    .from(sessions)
    .innerJoin(accounts, eq(sessions.accountId, accounts.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.account ?? null;
}

/** Cria sessão persistida e define o cookie (30 dias). */
export async function startSession(accountId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ tokenHash: hashToken(token), accountId, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * SESSION_DAYS });
}

/** Encerra a sessão atual (revoga o token) e limpa os cookies de identidade. */
export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  store.delete(SESSION_COOKIE);
  store.delete(COOKIE);
}

export async function getUser(): Promise<User | null> {
  // 1) Sessão de conta (outro dispositivo/login) → perfil vinculado
  const account = await getSessionAccount();
  if (account) {
    const rows = await db.select().from(users).where(eq(users.accountId, account.id)).limit(1);
    if (rows[0]) return rows[0];
  }
  // 2) Cookie anônimo (legado/sem conta)
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
