// Gamificação: sequências (streaks) e marcos (badges) derivados dos registros — função pura.
export type DailyCounts = {
  /** Datas (YYYY-MM-DD) com pelo menos 1 refeição registrada. */
  foodDays: string[];
  /** Datas com hidratação ≥ 90% da meta. */
  waterDays: string[];
  /** Datas com treino registrado. */
  workoutDays: string[];
  /** Datas com pesagem. */
  weighDays: string[];
  /** Total de treinos (para marcos por volume). */
  workouts: number;
  waterGoalMl?: number;
};

export type Streaks = {
  food: number;
  water: number;
  workout: number;
  bestFood: number;
};

export type Badge = {
  key: string;
  label: string;
  desc: string;
  icon: string;
  earned: boolean;
  progress: string; // ex.: "4/7 dias"
  /** Chaves i18n (label/desc/progress traduzidos na UI). */
  labelKey: string;
  descKey: string;
  progressKey: string;
  progressVars: { n: number; target: number; unitKey: string };
};

function addDaysISO(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Sequência de dias consecutivos terminando hoje (ou ontem, se hoje ainda não tem registro). */
export function streakOf(dates: string[], today: string): number {
  const set = new Set(dates);
  let cursor = set.has(today) ? today : addDaysISO(today, -1);
  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = addDaysISO(cursor, -1);
  }
  return n;
}

function bestStreakOf(dates: string[]): number {
  const sorted = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev !== null && addDaysISO(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function computeStreaks(c: DailyCounts, today: string): Streaks {
  return {
    food: streakOf(c.foodDays, today),
    water: streakOf(c.waterDays, today),
    workout: streakOf(c.workoutDays, today),
    bestFood: Math.max(bestStreakOf(c.foodDays), streakOf(c.foodDays, today)),
  };
}

const uniq = (xs: string[]) => new Set(xs).size;

export function computeBadges(c: DailyCounts): Badge[] {
  const food = uniq(c.foodDays);
  const water = uniq(c.waterDays);
  const weigh = uniq(c.weighDays);
  const workouts = c.workouts;

  const tier = (n: number, steps: number[]) => {
    const target = steps.find((s) => n < s) ?? steps[steps.length - 1];
    return {
      earned: n >= steps[steps.length - 1] || steps.every((s) => n >= s),
      target,
      progress: `${Math.min(n, target)}/${target}`,
    };
  };

  const badge = (key: string, icon: string, label: string, desc: string, n: number, steps: number[], unit: string): Badge[] =>
    steps.map((s, i) => ({
      key: `${key}${i + 1}`,
      icon,
      label: `${label} ${["🥉", "🥈", "🥇", "🏆"][i] ?? "⭐"}`,
      desc: `${desc} (${s} ${unit})`,
      earned: n >= s,
      progress: `${Math.min(n, s)}/${s} ${unit}`,
      labelKey: `game.badge.${key}`,
      descKey: `game.badgeDesc.${key}`,
      progressKey: "game.progress",
      progressVars: { n: Math.min(n, s), target: s, unitKey: `game.unit.${key}` },
    }));

  return [
    ...badge("food", "🍽️", "Constância", "Dias com refeições registradas", food, [3, 7, 30, 100], "dias"),
    ...badge("water", "💧", "Hidratação", "Dias batendo a meta de água", water, [3, 7, 30], "dias"),
    ...badge("workout", "💪", "Força do hábito", "Treinos registrados", workouts, [5, 20, 50], "treinos"),
    ...badge("weigh", "⚖️", "Balança amiga", "Pesagens registradas", weigh, [4, 12, 26], "pesagens"),
    ...badge("mix", "🔥", "Semana completa", "Dias com treino E alimentação no mesmo dia",
      c.workoutDays.filter((d) => c.foodDays.includes(d)).length, [1, 4, 12], "dias"),
  ];
}

/** Resumo rápido para o dashboard. */
export function summarize(c: DailyCounts, today: string) {
  const streaks = computeStreaks(c, today);
  const badges = computeBadges(c);
  return {
    streaks,
    badges,
    earned: badges.filter((b) => b.earned).length,
    nextBadge: badges.find((b) => !b.earned) ?? null,
  };
}
