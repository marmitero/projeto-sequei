import { describe, expect, it } from "vitest";
import { computeStreaks, computeBadges, streakOf, summarize } from "../../src/lib/gamification";
import { buildReminderSchedule, dueSlots, formatClock } from "../../src/lib/reminders";
import { parseAppleHealthXml, parseWeightCsv, parseHealthFile } from "../../src/lib/healthimport";

describe("gamification", () => {
  const today = "2026-10-24";
  const counts = {
    foodDays: ["2026-10-22", "2026-10-23", "2026-10-24"],
    waterDays: ["2026-10-23", "2026-10-24"],
    workoutDays: ["2026-10-21", "2026-10-22"],
    weighDays: ["2026-10-01", "2026-10-08"],
    workouts: 6,
    waterGoalMl: 3000,
  };

  it("calcula sequências terminando hoje e com tolerância de ontem", () => {
    expect(streakOf(counts.foodDays, today)).toBe(3);
    // sem registro hoje: conta a partir de ontem
    expect(streakOf(["2026-10-23"], today)).toBe(1);
    expect(streakOf([], today)).toBe(0);
    const s = computeStreaks(counts, today);
    expect(s.food).toBe(3);
    expect(s.water).toBe(2);
    expect(s.workout).toBe(0); // ontem não tem treino
    expect(s.bestFood).toBe(3);
  });

  it("concede marcos por patamares e mostra progresso", () => {
    const badges = computeBadges(counts);
    const food1 = badges.find((b) => b.key === "food1")!; // 3 dias
    expect(food1.earned).toBe(true);
    const food2 = badges.find((b) => b.key === "food2")!; // 7 dias
    expect(food2.earned).toBe(false);
    expect(food2.progress).toBe("3/7 dias");
    const workout1 = badges.find((b) => b.key === "workout1")!; // 5 treinos
    expect(workout1.earned).toBe(true);
    const sum = summarize(counts, today);
    expect(sum.earned).toBeGreaterThanOrEqual(3);
    expect(sum.nextBadge?.earned).toBe(false);
  });
});

describe("reminders", () => {
  it("distribui água entre acordar e dormir e agenda treino/pesagem", () => {
    const slots = buildReminderSchedule({
      wakeTime: "07:00",
      sleepTime: "23:00",
      waterMl: 2000,
      trainingDays: 4,
      trainingTime: "manha",
      weighDay: 1,
    });
    const agua = slots.filter((s) => s.kind === "agua");
    expect(agua.length).toBe(8); // 2000/250
    expect(agua[0].atMinutes).toBeGreaterThanOrEqual(7 * 60 + 30);
    expect(agua[agua.length - 1].atMinutes).toBeLessThanOrEqual(22 * 60);

    const treino = slots.find((s) => s.kind === "treino")!;
    expect(treino.atMinutes).toBe(8 * 60); // acordar + 1h
    expect(treino.days).toEqual([1, 2, 3, 4, 5]);

    const pesagem = slots.find((s) => s.kind === "pesagem")!;
    expect(pesagem.days).toEqual([1]);
    expect(formatClock(pesagem.atMinutes)).toBe("07:45");
  });

  it("filtra por dia da semana e horário", () => {
    const slots = buildReminderSchedule({ wakeTime: "07:00", sleepTime: "23:00", waterMl: 1000, trainingDays: 1, trainingTime: "noite" });
    const treino = slots.find((s) => s.kind === "treino")!;
    expect(treino.days).toBeUndefined(); // < 3x/semana = todos os dias
    expect(dueSlots([treino], 6, treino.atMinutes)).toHaveLength(1);
    expect(dueSlots([treino], 6, treino.atMinutes + 30)).toHaveLength(0);

    const pesagem = slots.find((s) => s.kind === "pesagem")!;
    expect(dueSlots([pesagem], 3, pesagem.atMinutes)).toHaveLength(0); // só segunda
    expect(dueSlots([pesagem], 1, pesagem.atMinutes)).toHaveLength(1);
  });
});

describe("healthimport", () => {
  const xml = `<?xml version="1.0"?>
<HealthData>
  <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="iPhone" unit="kg" value="72.4" startDate="2026-10-20 07:10:00 -0300" endDate="2026-10-20 07:10:00 -0300"/>
  <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Balança" unit="lb" value="158.7" startDate="2026-10-21 07:05:00 -0300" endDate="2026-10-21 07:05:00 -0300"/>
  <Record type="HKQuantityTypeIdentifierBodyFatPercentage" sourceName="Balança" value="0.215" startDate="2026-10-20 07:10:00 -0300" endDate="2026-10-20 07:10:00 -0300"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAsleep" startDate="2026-10-20 23:10:00 -0300" endDate="2026-10-21 06:40:00 -0300"/>
  <Record type="HKQuantityTypeIdentifierStepCount" value="8000" startDate="2026-10-20 10:00:00 -0300" endDate="2026-10-20 11:00:00 -0300"/>
</HealthData>`;

  it("extrai peso (kg e lb), gordura e sono do export do Apple Health", () => {
    const d = parseAppleHealthXml(xml);
    expect(d.weights).toEqual([
      { date: "2026-10-20", value: 72.4 },
      { date: "2026-10-21", value: 72 }, // 158.7 lb ≈ 72,0 kg
    ]);
    expect(d.bodyFat).toEqual([{ date: "2026-10-20", value: 21.5 }]);
    expect(d.sleep).toEqual([{ date: "2026-10-20", value: 7.5 }]);
  });

  it("lê CSV de peso flexível (Google Fit / planilha)", () => {
    const csv = ["Date,Weight (kg),Weight (lb)", "2026-10-19,73.2,161.4", "2026-10-20,72.8,159.2", "20/10/2026,999"].join("\n");
    const d = parseWeightCsv(csv);
    expect(d.weights).toEqual([
      { date: "2026-10-19", value: 73.2 },
      { date: "2026-10-20", value: 72.8 },
    ]);
    // planilha com ; e decimal vírgula (export BR)
    const br = parseWeightCsv(["Data;Peso (kg)", "2026-10-21;72,8"].join("\n"));
    expect(br.weights).toEqual([{ date: "2026-10-21", value: 72.8 }]);
  });

  it("detecta o formato automaticamente e ignora arquivos sem dados", () => {
    expect(parseHealthFile(xml).weights).toHaveLength(2);
    expect(parseHealthFile("Data,Peso (kg)\n2026-10-01,70").weights).toHaveLength(1);
    expect(parseHealthFile("<xml></xml>").weights).toHaveLength(0);
    expect(parseHealthFile("a,b\n1,2").weights).toHaveLength(0);
  });
});
