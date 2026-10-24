import { describe, expect, it } from "vitest";
import {
  computeTargets,
  bmi,
  bmiClass,
  navyBodyFat,
  ageFrom,
  weeksToGoal,
  mealsFor,
  todayIn,
  addDays,
  weekdayOf,
  hashSeed,
  rng,
  MEALS,
  type Profile,
} from "../../src/lib/calc";

const baseProfile: Profile = {
  name: "Ana", sex: "F", birthDate: "1994-05-12", heightCm: 165, weightKg: 72.4, targetWeightKg: 62,
  goal: "perder", pace: "moderado", activityLevel: "leve", experience: "iniciante", trainingDays: 3, sessionMinutes: 60,
  location: "casa", equipment: ["halteres"], cardioPrefs: ["caminhada"], injuries: ["joelho"], diet: "onivoro",
  carbApproach: "equilibrado", restrictions: [], dislikes: "", healthConditions: [], mealsPerDay: 5,
  wakeTime: "06:30", sleepTime: "22:30", trainingTime: "manha", climate: "quente", timezone: "America/Sao_Paulo",
};

describe("calc", () => {
  it("calcula idade", () => {
    const a = ageFrom("2000-01-01");
    expect(a).toBeGreaterThanOrEqual(26);
    expect(a).toBeLessThanOrEqual(27);
  });

  it("IMC e classificação OMS", () => {
    expect(bmi(70, 170)).toBeCloseTo(24.22, 1);
    expect(bmiClass(17).label).toBe("Abaixo do peso");
    expect(bmiClass(24).label).toBe("Eutrófico");
    expect(bmiClass(27).label).toBe("Sobrepeso");
    expect(bmiClass(32).label).toBe("Obesidade I");
    expect(bmiClass(37).label).toBe("Obesidade II");
    expect(bmiClass(42).label).toBe("Obesidade III");
  });

  it("% gordura Navy (M/F) e medidas faltando", () => {
    const m = navyBodyFat("M", 180, 85, 38);
    expect(m).not.toBeNull();
    expect(m!).toBeGreaterThan(10);
    expect(m!).toBeLessThan(30);
    const f = navyBodyFat("F", 165, 80, 32, 98);
    expect(f).not.toBeNull();
    expect(f!).toBeGreaterThan(15);
    expect(f!).toBeLessThan(45);
    expect(navyBodyFat("M", 180, null, 38)).toBeNull();
  });

  it("metas: Mifflin + déficit 18% conferem à mão", () => {
    const tg = computeTargets(baseProfile);
    const bmr = 10 * 72.4 + 6.25 * 165 - 5 * 32 - 161;
    const tdee = bmr * 1.375;
    const kcal = tdee * 0.82;
    expect(tg.bmr).toBeCloseTo(Math.round(bmr), 0);
    expect(tg.tdee).toBeCloseTo(Math.round(tdee), 0);
    expect(tg.kcal).toBeCloseTo(Math.round(kcal), 0);
    expect(tg.deltaKcal).toBeLessThan(0);
    expect(tg.weeklyChangeKg).toBeLessThan(0);
    const macroKcal = tg.protein * 4 + tg.carbs * 4 + tg.fat * 9;
    expect(Math.abs(macroKcal - tg.kcal) / tg.kcal).toBeLessThan(0.05);
    expect(tg.proteinPerKg).toBeGreaterThanOrEqual(1.4);
    expect(tg.proteinPerKg).toBeLessThanOrEqual(2.2);
    expect(tg.fiber).toBeGreaterThanOrEqual(15);
    expect(tg.water).toBeGreaterThan(2000);
    expect(tg.water % 50).toBe(0);
  });

  it("piso calórico seguro (1200 kcal F) com aviso", () => {
    const tg = computeTargets({ ...baseProfile, sex: "F", weightKg: 45, heightCm: 150, birthDate: "1990-01-01", activityLevel: "sedentario", pace: "agressivo" });
    expect(tg.kcal).toBeGreaterThanOrEqual(1200);
    expect(tg.notes.some((n) => n.includes("mínimo seguro"))).toBe(true);
  });

  it("gestante/lactante nunca em déficit", () => {
    const g = computeTargets({ ...baseProfile, goal: "perder", healthConditions: ["gestante"] });
    expect(g.deltaKcal).toBeGreaterThanOrEqual(300);
    const l = computeTargets({ ...baseProfile, goal: "perder", healthConditions: ["lactante"] });
    expect(l.deltaKcal).toBeGreaterThanOrEqual(450);
  });

  it("renal limita proteína a 0,8 g/kg", () => {
    const tg = computeTargets({ ...baseProfile, healthConditions: ["renal"] });
    expect(tg.proteinPerKg).toBeLessThanOrEqual(0.85);
  });

  it("cetogênica: ~30 g de carboidrato", () => {
    const tg = computeTargets({ ...baseProfile, carbApproach: "cetogenica" });
    expect(tg.carbs).toBeGreaterThanOrEqual(20);
    expect(tg.carbs).toBeLessThanOrEqual(35);
  });

  it("semanas até o objetivo coerentes", () => {
    const tg = computeTargets(baseProfile);
    const w = weeksToGoal(baseProfile, tg);
    expect(w).not.toBeNull();
    expect(w!).toBeGreaterThan(5);
    expect(w!).toBeLessThan(200);
  });

  it("mealsFor 3–6 refeições e MEALS completo", () => {
    expect(mealsFor(3)).toEqual(["cafe", "almoco", "jantar"]);
    expect(mealsFor(5)).toHaveLength(5);
    expect(mealsFor(6)).toHaveLength(6);
    expect(Object.keys(MEALS)).toHaveLength(6);
  });

  it("datas: todayIn/addDays/weekdayOf", () => {
    expect(todayIn("America/Sao_Paulo")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekdayOf("2026-10-24")).toBe(6); // sábado
  });

  it("RNG determinístico por seed", () => {
    expect(hashSeed("abc")).toBe(hashSeed("abc"));
    const r1 = rng(hashSeed("x"));
    const r2 = rng(hashSeed("x"));
    expect(r1()).toBe(r2());
    const v = r1();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});
