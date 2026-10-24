// Relatório semanal e tendências (últimas N semanas) — funções puras.
import { addDays } from "./calc";

export type WeekSummary = {
  from: string;
  to: string;
  daysLogged: number;
  avgKcal: number;
  avgProtein: number;
  waterDays: number; // dias ≥ 90% da meta
  avgWater: number;
  workouts: number;
  weightChangeKg: number | null;
};

export type WeeklyReport = {
  current: WeekSummary;
  previous: WeekSummary;
  trends: WeekSummary[]; // da mais antiga para a mais recente
};

type MacroRow = { date: string; kcal: number; protein: number };
type WaterRow = { date: string; ml: number };
type WorkoutRow = { date: string };
type WeightRow = { date: string; weightKg: number | null };

function summarize(
  from: string,
  to: string,
  foods: MacroRow[],
  water: WaterRow[],
  workouts: WorkoutRow[],
  weights: WeightRow[],
  targets: { kcal: number; protein: number; water: number },
): WeekSummary {
  const inRange = <T extends { date: string }>(rows: T[]) => rows.filter((r) => r.date >= from && r.date <= to);
  const f = inRange(foods);
  const w = inRange(water);
  const tr = inRange(workouts);
  const ms = inRange(weights).filter((m) => m.weightKg != null);

  const foodDays = [...new Set(f.map((x) => x.date))];
  const waterByDay = new Map<string, number>();
  for (const row of w) waterByDay.set(row.date, (waterByDay.get(row.date) ?? 0) + row.ml);
  const waterDays = [...waterByDay.values()].filter((ml) => ml >= targets.water * 0.9).length;

  const first = ms[0]?.weightKg ?? null;
  const last = ms[ms.length - 1]?.weightKg ?? null;

  return {
    from,
    to,
    daysLogged: foodDays.length,
    avgKcal: foodDays.length ? Math.round(inRange(foods).reduce((a, x) => a + x.kcal, 0) / foodDays.length) : 0,
    avgProtein: foodDays.length ? Math.round(f.reduce((a, x) => a + x.protein, 0) / foodDays.length) : 0,
    waterDays,
    avgWater: waterByDay.size ? Math.round([...waterByDay.values()].reduce((a, b) => a + b, 0) / waterByDay.size) : 0,
    workouts: tr.length,
    weightChangeKg: first !== null && last !== null ? +(last - first).toFixed(1) : null,
  };
}

/** Semana atual (7 dias terminando hoje), semana anterior e tendências das últimas `weeks` semanas. */
export function buildWeeklyReport(
  today: string,
  foods: MacroRow[],
  water: WaterRow[],
  workouts: WorkoutRow[],
  weights: WeightRow[],
  targets: { kcal: number; protein: number; water: number },
  weeks = 4,
): WeeklyReport {
  const trends: WeekSummary[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const to = addDays(today, -7 * i);
    const from = addDays(to, -6);
    trends.push(summarize(from, to, foods, water, workouts, weights, targets));
  }
  return { current: trends[trends.length - 1], previous: trends[trends.length - 2], trends };
}

export function pctDelta(cur: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}
