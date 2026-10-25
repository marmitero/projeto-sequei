// Ajuste inteligente de metas: motor DETERMINÍSTICO de regras (sem LLM externo)
// que recomenda — e aplica — metas com base na aderência real (comida, água, treino)
// e na tendência de peso vs. a projeção do perfil. Funções puras.
import type { Targets } from "./calc";

/** Overrides parciais de metas (aplicados sobre computeTargets). */
export type TargetOverrides = {
  kcal?: number;
  water?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
};

export type CoachDay = { date: string; eatenKcal: number | null; waterMl: number; trained: boolean };

export type CoachInput = {
  targets: Targets;
  goal: string; // perder | manter | ganhar | recomp
  sex: string; // M | F
  plannedPerWeek: number; // treinos planejados (trainingDays)
  days: CoachDay[]; // janela de análise (28 dias)
  weights: { date: string; kg: number }[]; // pesagens (ordenadas por data)
};

export type Recommendation = {
  key: string;
  area: "peso" | "kcal" | "agua" | "treino" | "hábito";
  title: string;
  detail: string;
  /** Novo valor absoluto da meta, quando aplicável. */
  apply?: TargetOverrides;
};

/** Aplica overrides com pisos/tetos seguros. Retorna as metas efetivas. */
export function clampTargets(base: Targets, sex: string, overrides: TargetOverrides | null | undefined): Targets {
  const o = overrides ?? {};
  const kcalFloor = sex === "M" ? 1500 : 1200;
  const n = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v)));
  return {
    ...base,
    kcal: o.kcal != null ? n(o.kcal, kcalFloor, 6000) : base.kcal,
    water: o.water != null ? n(o.water, 1500, 6000) : base.water,
    protein: o.protein != null ? n(o.protein, 40, 400) : base.protein,
    carbs: o.carbs != null ? n(o.carbs, 20, 800) : base.carbs,
    fat: o.fat != null ? n(o.fat, 20, 300) : base.fat,
    fiber: o.fiber != null ? n(o.fiber, 10, 80) : base.fiber,
  };
}

/** Taxa semanal observada (kg/semana, negativa = perda) — null sem dados suficientes. */
export function weeklyWeightRate(weights: { date: string; kg: number }[]): number | null {
  if (weights.length < 4) return null;
  const first = weights[0];
  const last = weights[weights.length - 1];
  const days = (Date.parse(last.date) - Date.parse(first.date)) / 86_400_000;
  if (days < 14) return null;
  return +(((last.kg - first.kg) / days) * 7).toFixed(2);
}

export function coachRecommendations(input: CoachInput): Recommendation[] {
  const out: Recommendation[] = [];
  const days = input.days;
  const logged = days.filter((d) => d.eatenKcal != null);
  const weekCount = Math.max(days.length / 7, 1);

  // 1) Tendência de peso vs. projeção (a "IA" é regra explícita e auditável)
  const rate = weeklyWeightRate(input.weights);
  const desired = input.goal === "perder" ? -Math.abs(input.targets.weeklyChangeKg) : input.goal === "ganhar" ? Math.abs(input.targets.weeklyChangeKg) : 0;
  if (rate != null && (input.goal === "perder" || input.goal === "ganhar")) {
    const slower = input.goal === "perder" ? rate > desired * 0.5 : rate < desired * 0.5;
    const faster = input.goal === "perder" ? rate < desired * 1.5 : rate > desired * 1.5;
    if (faster) {
      out.push({
        key: "peso-rapido",
        area: "peso",
        title: "A evolução está mais rápida que o planejado",
        detail: `Você está variando ${rate} kg/semana, contra a projeção de ${desired} kg/semana. Reduzir o déficit protege massa magra e energia — sugerimos +100 kcal na meta.`,
        apply: { kcal: input.targets.kcal + 100 },
      });
    } else if (slower) {
      out.push({
        key: "peso-lento",
        area: "peso",
        title: "A evolução está mais lenta que o planejado",
        detail: `Você está variando ${rate} kg/semana, contra a projeção de ${desired} kg/semana. Um ajuste fino de −100 kcal na meta pode destravar o progresso.`,
        apply: { kcal: input.targets.kcal - 100 },
      });
    } else {
      out.push({
        key: "peso-ok",
        area: "peso",
        title: "Evolução dentro do planejado",
        detail: `Variação de ${rate} kg/semana compatível com a projeção de ${desired} kg/semana. Mantenha a meta atual.`,
      });
    }
  }

  // 2) Aderência de registro de refeições
  const logRate = logged.length / days.length;
  if (logRate < 0.6) {
    out.push({
      key: "registro-baixo",
      area: "hábito",
      title: "Registros irregulares",
      detail: `Você registrou refeições em apenas ${logged.length} dos últimos ${days.length} dias (${Math.round(logRate * 100)}%). Registrar mesmo nos dias fora da dieta é o que dá precisão às metas — use "Repetir de ontem" para acelerar.`,
    });
  }

  // 3) Água: meta realista conforme a aderência observada
  const waterDays = logged.map((d) => d.waterMl);
  const waterAvg = waterDays.length ? waterDays.reduce((a, b) => a + b, 0) / waterDays.length : 0;
  if (waterDays.length >= 5 && waterAvg < input.targets.water * 0.7) {
    const realistic = Math.min(5000, Math.max(1500, Math.round(waterAvg / 250) * 250));
    if (input.targets.water > 2000 && realistic < input.targets.water) {
      out.push({
        key: "agua-real",
        area: "agua",
        title: "A meta de água está acima da sua rotina",
        detail: `Média de ${Math.round(waterAvg)} ml/dia contra a meta de ${input.targets.water} ml. Ajustar para ${realistic} ml (e subir aos poucos) costuma ser mais sustentável.`,
        apply: { water: realistic },
      });
    } else {
      out.push({
        key: "agua-dica",
        area: "agua",
        title: "Hidratação abaixo do esperado",
        detail: `Média de ${Math.round(waterAvg)} ml/dia contra a meta de ${input.targets.water} ml. Ative os lembretes (sino no topo) para espaçar os copos ao longo do dia.`,
      });
    }
  }

  // 4) Treino: planejado vs. realizado
  const planned = Math.max(1, Math.round(input.plannedPerWeek * weekCount));
  const done = days.filter((d) => d.trained).length;
  const trainRate = done / planned;
  if (trainRate < 0.5) {
    out.push({
      key: "treino-baixo",
      area: "treino",
      title: "Treinos abaixo do planejado",
      detail: `${done} de ${planned} sessões no período. Reduza a barreira: uma sessão curta (20 min) já mantém o hábito — o plano se adapta à sua rotina.`,
    });
  }

  if (!out.length) {
    out.push({
      key: "manter",
      area: "hábito",
      title: "Tudo no ritmo — mantenha!",
      detail: "Registro, hidratação, treinos e evolução de peso coerentes com o planejado. Nenhum ajuste necessário agora.",
    });
  }
  return out;
}
