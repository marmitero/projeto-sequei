import { LineChart as LineIcon } from "lucide-react";
import { getContext, allMetrics, foodsBetween, waterBetween, workoutsBetween } from "@/lib/data";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { progressPhotos } from "@/db/schema";
import { addDays } from "@/lib/calc";
import { buildWeeklyReport } from "@/lib/weekly";
import { PageHeader } from "@/components/ui";
import MetricsPanel from "./MetricsPanel";
import WeeklySection from "./WeeklySection";
import PhotosSection from "./PhotosSection";

export default async function MetricasPage() {
  const { user, profile, targets, today } = await getContext();
  const from = addDays(today, -27);
  const [ms, foods, water, workouts] = await Promise.all([allMetrics(user.id), foodsBetween(user.id, from, today), waterBetween(user.id, from, today), workoutsBetween(user.id, from, today)]);
  const photoRows = await db
    .select({ id: progressPhotos.id, date: progressPhotos.date, label: progressPhotos.label, mime: progressPhotos.mime })
    .from(progressPhotos)
    .where(eq(progressPhotos.userId, user.id))
    .orderBy(desc(progressPhotos.date), desc(progressPhotos.createdAt));

  // Métricas de aderência: últimas 2 semanas (como antes)
  const recent = addDays(today, -13);
  const foods14 = foods.filter((f) => f.date >= recent);
  const water14 = water.filter((w) => w.date >= recent);
  const workouts14 = workouts.filter((w) => w.date >= recent);

  const foodDays = [...new Set(foods14.map((f) => f.date))];
  const avg = (n: number, d: number) => (d ? n / d : 0);
  const adherence = {
    daysLogged: foodDays.length,
    kcal: avg(foods14.reduce((a, f) => a + f.kcal, 0), foodDays.length),
    protein: avg(foods14.reduce((a, f) => a + f.protein, 0), foodDays.length),
    waterDays: [...new Set(water14.map((w) => w.date))].length,
    water: avg(water14.reduce((a, w) => a + w.ml, 0), [...new Set(water14.map((w) => w.date))].length),
    workouts: workouts14.length,
  };

  const report = buildWeeklyReport(
    today,
    foods.map((f) => ({ date: f.date, kcal: f.kcal, protein: f.protein })),
    water.map((w) => ({ date: w.date, ml: w.ml })),
    workouts.map((w) => ({ date: w.date })),
    ms.map((m) => ({ date: m.date, weightKg: m.weightKg })),
    { kcal: targets.kcal, protein: targets.protein, water: targets.water },
  );

  return (
    <>
      <PageHeader title="Métricas" subtitle="Acompanhe peso, medidas e composição corporal. Seu peso atualiza as metas automaticamente." icon={<LineIcon size={22} />} />
      <div className="space-y-8">
        <WeeklySection report={report} />
        <PhotosSection today={today} initialPhotos={photoRows} />
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
      </div>
    </>
  );
}
