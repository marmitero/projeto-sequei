import { LineChart as LineIcon } from "lucide-react";
import { getContext, allMetrics, foodsBetween, waterBetween, workoutsBetween } from "@/lib/data";
import { addDays } from "@/lib/calc";
import { PageHeader } from "@/components/ui";
import MetricsPanel from "./MetricsPanel";

export default async function MetricasPage() {
  const { user, profile, targets, today } = await getContext();
  const from = addDays(today, -13);
  const [ms, foods, water, workouts] = await Promise.all([allMetrics(user.id), foodsBetween(user.id, from, today), waterBetween(user.id, from, today), workoutsBetween(user.id, from, today)]);

  const foodDays = [...new Set(foods.map((f) => f.date))];
  const avg = (n: number, d: number) => (d ? n / d : 0);
  const adherence = {
    daysLogged: foodDays.length,
    kcal: avg(foods.reduce((a, f) => a + f.kcal, 0), foodDays.length),
    protein: avg(foods.reduce((a, f) => a + f.protein, 0), foodDays.length),
    waterDays: [...new Set(water.map((w) => w.date))].length,
    water: avg(water.reduce((a, w) => a + w.ml, 0), [...new Set(water.map((w) => w.date))].length),
    workouts: workouts.length,
  };

  return (
    <>
      <PageHeader title="Métricas" subtitle="Acompanhe peso, medidas e composição corporal. Seu peso atualiza as metas automaticamente." icon={<LineIcon size={22} />} />
      <MetricsPanel
        today={today}
        profile={profile}
        targets={{ kcal: targets.kcal, protein: targets.protein, water: targets.water }}
        adherence={adherence}
        metrics={ms.map((m) => ({
          id: m.id,
          date: m.date,
          weightKg: m.weightKg,
          bodyFatPct: m.bodyFatPct,
          waistCm: m.waistCm,
          hipCm: m.hipCm,
          neckCm: m.neckCm,
          chestCm: m.chestCm,
          armCm: m.armCm,
          thighCm: m.thighCm,
          restingHr: m.restingHr,
          sleepHours: m.sleepHours,
          notes: m.notes,
        }))}
      />
    </>
  );
}
