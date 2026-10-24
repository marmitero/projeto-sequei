import { describe, expect, it } from "vitest";
import type { Profile } from "../../src/lib/calc";
import { generateWorkoutPlan, kcalFromMet, EXERCISES, CARDIO, ACTIVITY_METS, availableEquipment } from "../../src/lib/exercises";

const baseProfile: Profile = {
  name: "Ana", sex: "F", birthDate: "1994-05-12", heightCm: 165, weightKg: 72.4, targetWeightKg: 62,
  goal: "perder", pace: "moderado", activityLevel: "leve", experience: "iniciante", trainingDays: 3, sessionMinutes: 60,
  location: "casa", equipment: ["halteres"], cardioPrefs: ["caminhada"], injuries: ["joelho"], diet: "onivoro",
  carbApproach: "equilibrado", restrictions: [], dislikes: "", healthConditions: [], mealsPerDay: 5,
  wakeTime: "06:30", sleepTime: "22:30", trainingTime: "manha", climate: "quente", timezone: "America/Sao_Paulo",
};

describe("exercises", () => {
  it("kcalFromMet = MET × peso × horas", () => {
    expect(kcalFromMet(8, 70, 60)).toBe(560);
    expect(kcalFromMet(5, 80, 30)).toBe(200);
  });

  it("plano de 3 dias = seg/qua/sex, com duração e lesões respeitadas", () => {
    const plan = generateWorkoutPlan(baseProfile);
    expect(plan).toHaveLength(3);
    expect(plan.map((s) => s.weekday)).toEqual([1, 3, 5]);
    for (const s of plan) {
      expect(s.exercises.length).toBeGreaterThanOrEqual(3);
      expect(s.exercises.length).toBeLessThanOrEqual(8);
      expect(s.minutes).toBe(60);
      expect(s.kcal).toBeGreaterThan(100);
      for (const e of s.exercises) {
        const def = EXERCISES.find((x) => x.name === e.name);
        if (def) expect(def.avoid).not.toContain("joelho");
        expect(e.sets).toBeGreaterThanOrEqual(1);
        expect(e.sets).toBeLessThanOrEqual(6);
      }
    }
  });

  it("4–7 dias usam splits adequados", () => {
    expect(generateWorkoutPlan({ ...baseProfile, trainingDays: 5, location: "academia" })).toHaveLength(5);
    expect(generateWorkoutPlan({ ...baseProfile, trainingDays: 7, location: "academia" })).toHaveLength(7);
    const p4 = generateWorkoutPlan({ ...baseProfile, trainingDays: 4, location: "academia" });
    expect(p4).toHaveLength(4);
    expect(p4.some((s) => s.title.includes("Superiores"))).toBe(true);
  });

  it("iniciante só recebe exercícios de nível 1", () => {
    const plan = generateWorkoutPlan({ ...baseProfile, experience: "iniciante", location: "academia" });
    for (const s of plan) {
      for (const e of s.exercises) {
        const def = EXERCISES.find((x) => x.name === e.name);
        if (def) expect(def.level).toBe(1);
      }
    }
  });

  it("gestante: sem HIIT e sem exercícios evitados", () => {
    const p = { ...baseProfile, healthConditions: ["gestante"], cardioPrefs: ["hiit", "caminhada"], location: "academia" };
    const plan = generateWorkoutPlan(p);
    for (const s of plan) {
      if (s.cardio) expect(s.cardio.key).not.toBe("hiit");
      for (const e of s.exercises) {
        expect(["abd_infra", "mountain_climber", "kb_swing", "superman"]).not.toContain(e.id);
      }
    }
  });

  it("obesidade força cardio de baixo impacto", () => {
    const p = { ...baseProfile, weightKg: 120, heightCm: 165, cardioPrefs: ["corrida"], location: "academia" };
    const plan = generateWorkoutPlan(p);
    for (const s of plan) if (s.cardio) expect(CARDIO[s.cardio.key].impact).toBe("baixo");
  });

  it("casa sem equipamento: só peso corporal", () => {
    const plan = generateWorkoutPlan({ ...baseProfile, location: "casa", equipment: [] });
    for (const s of plan) {
      for (const e of s.exercises) {
        const def = EXERCISES.find((x) => x.name === e.name);
        if (def) expect(def.equip).toContain("none");
      }
    }
    expect(availableEquipment({ ...baseProfile, location: "casa", equipment: ["halteres"] })).toEqual(["none", "halteres"]);
  });

  it("catálogos válidos", () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(40);
    for (const c of Object.values(CARDIO)) expect(c.met).toBeGreaterThan(0);
    for (const a of ACTIVITY_METS) expect(a.met).toBeGreaterThan(0);
  });
});
