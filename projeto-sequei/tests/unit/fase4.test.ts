import { describe, expect, it } from "vitest";
import { clampTargets, coachRecommendations, weeklyWeightRate, type CoachDay } from "../../src/lib/goalcoach";
import { computeTargets, type Profile } from "../../src/lib/calc";
import { normalizeRecipeInput, parseIngredientLine } from "../../src/lib/community";

const profile: Profile = {
  name: "Teste",
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
  equipment: [],
  cardioPrefs: [],
  injuries: [],
  diet: "onivoro",
  carbApproach: "equilibrado",
  restrictions: [],
  dislikes: "",
  healthConditions: [],
  mealsPerDay: 5,
  wakeTime: "06:30",
  sleepTime: "22:30",
  trainingTime: "manha",
  climate: "temperado",
  timezone: "America/Sao_Paulo",
};

const targets = computeTargets(profile);

const day = (i: number, over: Partial<CoachDay> = {}): CoachDay => ({
  date: `2026-10-${String(i + 1).padStart(2, "0")}`,
  eatenKcal: 1800,
  waterMl: 2200,
  trained: i % 2 === 0,
  ...over,
});

describe("goalcoach — clampTargets", () => {
  it("aplica overrides com pisos e tetos seguros", () => {
    const t = clampTargets(targets, "F", { kcal: 900, water: 800, protein: 4000 });
    expect(t.kcal).toBe(1200); // piso feminino
    expect(t.water).toBe(1500);
    expect(t.protein).toBe(400); // teto
    const m = clampTargets(targets, "M", { kcal: 900 });
    expect(m.kcal).toBe(1500); // piso masculino
    const none = clampTargets(targets, "F", null);
    expect(none.kcal).toBe(targets.kcal);
  });
});

describe("goalcoach — weeklyWeightRate", () => {
  it("calcula kg/semana e exige ≥4 pontos em ≥14 dias", () => {
    expect(weeklyWeightRate([])).toBeNull();
    expect(weeklyWeightRate([{ date: "2026-10-01", kg: 70 }, { date: "2026-10-02", kg: 69 }, { date: "2026-10-03", kg: 68 }, { date: "2026-10-04", kg: 67 }])).toBeNull(); // < 14 dias
    const r = weeklyWeightRate([
      { date: "2026-10-01", kg: 74 },
      { date: "2026-10-08", kg: 73 },
      { date: "2026-10-15", kg: 72 },
      { date: "2026-10-22", kg: 71 },
    ]);
    expect(r).toBe(-1);
  });
});

describe("goalcoach — recomendações", () => {
  const days = Array.from({ length: 28 }, (_, i) => day(i % 28));
  const weightsOnTrack = [
    { date: "2026-10-01", kg: 73.2 },
    { date: "2026-10-08", kg: 72.8 },
    { date: "2026-10-15", kg: 72.4 },
    { date: "2026-10-22", kg: 72.0 },
  ];

  it("peso rápido demais → +100 kcal aplicável", () => {
    const recs = coachRecommendations({
      targets,
      goal: "perder",
      sex: "F",
      plannedPerWeek: 3,
      days,
      weights: [
        { date: "2026-10-01", kg: 76 },
        { date: "2026-10-08", kg: 74 },
        { date: "2026-10-15", kg: 72 },
        { date: "2026-10-22", kg: 70 },
      ],
    });
    const r = recs.find((x) => x.key === "peso-rapido")!;
    expect(r.apply?.kcal).toBe(targets.kcal + 100);
  });

  it("peso lento demais → −100 kcal aplicável", () => {
    const recs = coachRecommendations({
      targets,
      goal: "perder",
      sex: "F",
      plannedPerWeek: 3,
      days,
      weights: [
        { date: "2026-10-01", kg: 72.5 },
        { date: "2026-10-08", kg: 72.4 },
        { date: "2026-10-15", kg: 72.3 },
        { date: "2026-10-22", kg: 72.2 },
      ],
    });
    const r = recs.find((x) => x.key === "peso-lento")!;
    expect(r.apply?.kcal).toBe(targets.kcal - 100);
  });

  it("água baixa → meta realista aplicável; registro baixo → hábito", () => {
    const dry = Array.from({ length: 28 }, (_, i) => day(i, { waterMl: 800, eatenKcal: i < 10 ? 1800 : null }));
    const recs = coachRecommendations({ targets, goal: "manter", sex: "F", plannedPerWeek: 3, days: dry, weights: [] });
    expect(recs.find((x) => x.key === "agua-real")?.apply?.water).toBe(1000 > 1500 ? 1000 : 1500); // clamp em 1500
    expect(recs.find((x) => x.key === "registro-baixo")).toBeTruthy();
  });

  it("treino abaixo de 50% → dica; tudo ok com goal manter → manter", () => {
    const lazy = Array.from({ length: 28 }, (_, i) => day(i, { trained: false }));
    const recs = coachRecommendations({ targets, goal: "manter", sex: "F", plannedPerWeek: 3, days: lazy, weights: [] });
    expect(recs.find((x) => x.key === "treino-baixo")).toBeTruthy();

    const fine = Array.from({ length: 28 }, (_, i) => day(i, { trained: i % 2 === 0, waterMl: 5000 }));
    const ok = coachRecommendations({ targets, goal: "manter", sex: "F", plannedPerWeek: 3, days: fine, weights: [] });
    expect(ok.map((x) => x.key)).toEqual(["manter"]);
  });
});

describe("community — receitas", () => {
  it("interpreta linhas de ingrediente", () => {
    expect(parseIngredientLine("Frango grelhado — 150 g")).toEqual({ name: "Frango grelhado", grams: 150 });
    expect(parseIngredientLine("Arroz, 200")).toEqual({ name: "Arroz", grams: 200 });
    expect(parseIngredientLine("Ovo 2 un")).toEqual({ name: "Ovo", grams: 2 });
    expect(parseIngredientLine("Azeite")).toEqual({ name: "Azeite", grams: 0 });
    expect(parseIngredientLine("  ")).toBeNull();
  });

  it("valida e normaliza a receita", () => {
    const bad = normalizeRecipeInput({ name: "ab", kcal: 100 });
    expect(bad).toHaveProperty("error");
    const bad2 = normalizeRecipeInput({ name: "Boa receita", kcal: 0 });
    expect(bad2).toHaveProperty("error");

    const ok = normalizeRecipeInput({
      name: "  Panqueca proteica  ",
      description: "Rápida",
      ingredientsText: "Ovo — 2 un\nBanana — 80 g",
      steps: "Misture e frite.",
      tagsText: "Low-Carb, Café da manhã",
      kcal: 320.6,
      protein: 22,
      carbs: 30,
      fat: 9,
    });
    expect(ok).toMatchObject({
      name: "Panqueca proteica",
      kcal: 321,
      protein: 22,
      tags: ["low-carb", "café da manhã"],
      ingredients: [{ name: "Ovo", grams: 2 }, { name: "Banana", grams: 80 }],
    });
  });
});
