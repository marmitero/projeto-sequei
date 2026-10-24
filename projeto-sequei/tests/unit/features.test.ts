import { describe, expect, it } from "vitest";
import { generateShoppingList } from "../../src/lib/shopping";
import { parseLoadKg, progressionFor } from "../../src/lib/progression";
import { isValidBarcode, mapOpenFoodFacts } from "../../src/lib/barcode";
import { buildWeeklyReport, pctDelta } from "../../src/lib/weekly";
import type { Profile, Targets } from "../../src/lib/calc";

const PROFILE: Profile = {
  name: "Teste", sex: "m", birthDate: "1996-05-10", heightCm: 175, weightKg: 70, targetWeightKg: 65,
  goal: "perder", pace: "moderado", activityLevel: "moderado", experience: "iniciante",
  trainingDays: 3, sessionMinutes: 60, location: "academia", equipment: ["barra"], cardioPrefs: [],
  injuries: [], diet: "onivoro", carbApproach: "equilibrado", restrictions: [], dislikes: "",
  healthConditions: [], mealsPerDay: 4, wakeTime: "06:00", sleepTime: "23:00", trainingTime: "manha",
  climate: "quente", timezone: "America/Sao_Paulo",
};
const TARGETS: Targets = {
  bmr: 1680, tdee: 2595, kcal: 2200, protein: 154, carbs: 236, fat: 62, fiber: 30,
  water: 3000, waterTrainingExtra: 500, deltaKcal: -395, weeklyChangeKg: -0.4, proteinPerKg: 2.2, notes: [],
};

describe("shopping", () => {
  it("agrega o cardápio de 7 dias por alimento e por categoria", () => {
    const groups = generateShoppingList(PROFILE, TARGETS, "u1", "2026-10-24", 7);
    expect(groups.length).toBeGreaterThan(0);
    const items = groups.flatMap((g) => g.items);
    expect(items.length).toBeGreaterThan(10);
    for (const g of groups) {
      expect(g.items.length).toBeGreaterThan(0);
      for (const i of g.items) {
        expect(i.totalGrams).toBeGreaterThan(0);
        expect(i.portion.length).toBeGreaterThan(0);
        expect(i.kcal).toBeGreaterThan(0);
      }
    }
    expect(generateShoppingList(PROFILE, TARGETS, "u1", "2026-10-24", 7)).toEqual(groups);
  });
});

describe("progression", () => {
  it("parseLoadKg aceita formatos comuns e rejeita lixo", () => {
    expect(parseLoadKg("20")).toBe(20);
    expect(parseLoadKg("20 kg")).toBe(20);
    expect(parseLoadKg("20,5kg")).toBe(20.5);
    expect(parseLoadKg("barra")).toBeNull();
    expect(parseLoadKg("9999")).toBeNull();
    expect(parseLoadKg(undefined)).toBeNull();
  });

  it("sugere aumento após 2 sessões na mesma carga com esforço ≤ 8", () => {
    const logs = [
      { date: "2026-10-10", effort: 8, exercises: [{ name: "Supino reto", sets: 3, reps: "8", load: "40" }] },
      { date: "2026-10-13", effort: 8, exercises: [{ name: "Supino reto", sets: 3, reps: "8", load: "40" }] },
    ];
    const p = progressionFor(logs, "Supino reto");
    expect(p.series).toHaveLength(2);
    expect(p.suggestion.action).toBe("increase");
    expect(p.suggestion.nextKg).toBe(42);
  });

  it("mantém carga com esforço ≥ 9 e deload quando a carga cai", () => {
    const hard = [
      { date: "2026-10-10", effort: 9, exercises: [{ name: "Agachamento", sets: 3, reps: "5", load: "80" }] },
      { date: "2026-10-13", effort: 10, exercises: [{ name: "Agachamento", sets: 3, reps: "5", load: "80" }] },
    ];
    expect(progressionFor(hard, "Agachamento").suggestion.action).toBe("maintain");

    const falling = [
      { date: "2026-10-01", effort: 8, exercises: [{ name: "Agachamento", sets: 3, reps: "5", load: "80" }] },
      { date: "2026-10-08", effort: 8, exercises: [{ name: "Agachamento", sets: 3, reps: "5", load: "70" }] },
      { date: "2026-10-15", effort: 8, exercises: [{ name: "Agachamento", sets: 3, reps: "5", load: "65" }] },
    ];
    const d = progressionFor(falling, "Agachamento").suggestion;
    expect(d.action).toBe("deload");
    expect(d.nextKg).toBe(58.5);
  });

  it("sem histórico suficiente não sugere", () => {
    expect(progressionFor([], "Rosca direta").suggestion.action).toBe("none");
  });
});

describe("barcode", () => {
  it("valida o formato do código", () => {
    expect(isValidBarcode("7891234567895")).toBe(true);
    expect(isValidBarcode("12345")).toBe(false);
    expect(isValidBarcode("abc")).toBe(false);
  });

  it("mapeia a resposta do Open Food Facts", () => {
    const product = mapOpenFoodFacts({
      status: 1,
      product: {
        product_name: "Iogurte natural",
        nutriments: { "energy-kcal_100g": 61, proteins_100g: 3.5, carbohydrates_100g: 4.7, fat_100g: 3.3, fiber_100g: 0 },
      },
    });
    expect(product).toEqual({ name: "Iogurte natural", kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0 });
  });

  it("devolve null sem calorias ou sem nome", () => {
    expect(mapOpenFoodFacts({ status: 0 })).toBeNull();
    expect(mapOpenFoodFacts({ product: { product_name: "X", nutriments: { "energy-kcal_100g": 0 } } })).toBeNull();
    expect(mapOpenFoodFacts({ product: { nutriments: { "energy-kcal_100g": 10 } } })).toBeNull();
  });
});

describe("weekly", () => {
  const foods = [
    { date: "2026-10-20", kcal: 2000, protein: 140 },
    { date: "2026-10-21", kcal: 1800, protein: 120 },
    { date: "2026-10-23", kcal: 2200, protein: 150 },
    { date: "2026-10-13", kcal: 1000, protein: 50 },
  ];
  const water = [
    { date: "2026-10-20", ml: 3200 },
    { date: "2026-10-21", ml: 1500 },
    { date: "2026-10-13", ml: 3000 },
  ];
  const workouts = [{ date: "2026-10-20" }, { date: "2026-10-22" }, { date: "2026-10-12" }];
  const weights = [
    { date: "2026-10-20", weightKg: 70 },
    { date: "2026-10-23", weightKg: 69.2 },
  ];

  it("resume a semana corrente, a anterior e as tendências", () => {
    const r = buildWeeklyReport("2026-10-24", foods, water, workouts, weights, { kcal: 2200, protein: 140, water: 3000 }, 4);
    expect(r.trends).toHaveLength(4);
    expect(r.current.daysLogged).toBe(3);
    expect(r.current.avgKcal).toBe(2000);
    expect(r.current.workouts).toBe(2);
    expect(r.current.waterDays).toBe(1);
    expect(r.current.weightChangeKg).toBe(-0.8);
    expect(r.previous.daysLogged).toBe(1);
    expect(pctDelta(r.current.avgKcal, r.previous.avgKcal)).toBe(100);
    expect(pctDelta(100, 0)).toBeNull();
  });
});
