import { describe, expect, it } from "vitest";
import { computeTargets, type Profile } from "../../src/lib/calc";
import { FOOD_MAP, originAllowed } from "../../src/lib/foods";
import { generateMealPlan } from "../../src/lib/mealplan";

const baseProfile: Profile = {
  name: "Ana", sex: "F", birthDate: "1994-05-12", heightCm: 165, weightKg: 72.4, targetWeightKg: 62,
  goal: "perder", pace: "moderado", activityLevel: "leve", experience: "iniciante", trainingDays: 3, sessionMinutes: 60,
  location: "casa", equipment: ["halteres"], cardioPrefs: ["caminhada"], injuries: ["joelho"], diet: "onivoro",
  carbApproach: "equilibrado", restrictions: [], dislikes: "", healthConditions: [], mealsPerDay: 5,
  wakeTime: "06:30", sleepTime: "22:30", trainingTime: "manha", climate: "quente", timezone: "America/Sao_Paulo",
};

describe("mealplan", () => {
  it("gera nº de refeições do perfil com itens e kcal próximos da meta", () => {
    const tg = computeTargets(baseProfile);
    const plan = generateMealPlan(baseProfile, tg, "seed1");
    expect(plan).toHaveLength(5);
    for (const pm of plan) {
      expect(pm.items.length).toBeGreaterThan(0);
      expect(pm.totals.kcal).toBeGreaterThan(0);
    }
    const totalKcal = plan.reduce((a, p) => a + p.totals.kcal, 0);
    expect(Math.abs(totalKcal - tg.kcal) / tg.kcal).toBeLessThan(0.25);
  });

  it("respeita vegano + sem lactose + sem glúten em todos os itens", () => {
    const p = { ...baseProfile, diet: "vegano", restrictions: ["lactose", "gluten"] };
    const tg = computeTargets(p);
    const plan = generateMealPlan(p, tg, "seed2");
    for (const pm of plan) {
      for (const it of pm.items) {
        const f = FOOD_MAP[it.foodKey];
        expect(f).toBeTruthy();
        expect(originAllowed(f.o, "vegano")).toBe(true);
        expect(f.a).not.toContain("lac");
        expect(f.a).not.toContain("glu");
      }
    }
  });

  it("é determinístico por seed e o override troca as opções", () => {
    const tg = computeTargets(baseProfile);
    const a = generateMealPlan(baseProfile, tg, "s");
    const b = generateMealPlan(baseProfile, tg, "s");
    expect(a.map((x) => x.items.map((i) => i.foodKey))).toEqual(b.map((x) => x.items.map((i) => i.foodKey)));
    const c = generateMealPlan(baseProfile, tg, "s", { cafe: 1 });
    expect(a[0].items.map((i) => i.foodKey)).not.toEqual(c[0].items.map((i) => i.foodKey));
  });

  it("low-carb não sugere carbo refinado", () => {
    const p = { ...baseProfile, carbApproach: "lowcarb" };
    const tg = computeTargets(p);
    const plan = generateMealPlan(p, tg, "seed3");
    for (const pm of plan) {
      for (const it of pm.items) {
        expect(it.foodKey).not.toBe("arroz_branco");
        expect(it.foodKey).not.toBe("pao_frances");
      }
    }
  });
});
