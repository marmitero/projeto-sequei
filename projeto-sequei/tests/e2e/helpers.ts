// Helpers dos testes E2E: invocam Server Actions reais via HTTP
// (protocolo Next-Action, igual ao navegador) contra um servidor em execução.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

export function actionId(name: string): string {
  const manifestPath = resolve(process.cwd(), ".next/server/server-reference-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { node: Record<string, { exportedName: string }> };
  for (const [id, v] of Object.entries(manifest.node)) if (v.exportedName === name) return id;
  throw new Error(`Server action não encontrada no manifesto: ${name}`);
}

export type ActionResp = { status: number; setCookie: string[]; body: string };
export type PageResp = { status: number; body: string; location: string | null };

export async function callAction(path: string, name: string, args: unknown[], cookie?: string): Promise<ActionResp> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Next-Action": actionId(name),
      "Content-Type": "text/plain;charset=UTF-8",
      Origin: BASE,
      Accept: "text/x-component",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(args),
  });
  const body = await res.text();
  return { status: res.status, setCookie: res.headers.getSetCookie?.() ?? [], body };
}

export async function get(path: string, cookie?: string): Promise<PageResp> {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual", headers: cookie ? { Cookie: cookie } : {} });
  const body = await res.text();
  return { status: res.status, body, location: res.headers.get("location") };
}

export function cookieFrom(resp: ActionResp, name = "fituid"): string | null {
  const c = resp.setCookie.find((x) => x.startsWith(`${name}=`));
  return c ? c.split(";")[0] : null;
}

export const profileBase = {
  name: "Teste E2E",
  sex: "F",
  birthDate: "1994-05-12",
  heightCm: 165,
  weightKg: 72.4,
  targetWeightKg: 62,
  goal: "perder",
  pace: "moderado",
  activityLevel: "leve",
  experience: "iniciante",
  trainingDays: 3,
  sessionMinutes: 60,
  location: "casa",
  equipment: ["halteres", "elastico"],
  cardioPrefs: ["caminhada", "bike"],
  injuries: ["joelho"],
  diet: "onivoro",
  carbApproach: "equilibrado",
  restrictions: ["lactose"],
  dislikes: "peixe",
  healthConditions: [],
  mealsPerDay: 5,
  wakeTime: "06:30",
  sleepTime: "22:30",
  trainingTime: "manha",
  climate: "quente",
  timezone: "America/Sao_Paulo",
};
