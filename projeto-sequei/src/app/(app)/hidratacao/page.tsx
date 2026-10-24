import { Droplets } from "lucide-react";
import { getContext, waterBetween, workoutsBetween } from "@/lib/data";
import { addDays, weekdayOf } from "@/lib/calc";
import { generateWorkoutPlan } from "@/lib/exercises";
import { PageHeader } from "@/components/ui";
import WaterTracker from "./WaterTracker";

export default async function HidratacaoPage() {
  const { user, profile, targets, today } = await getContext();
  const from = addDays(today, -6);
  const [logs, workouts] = await Promise.all([waterBetween(user.id, from, today), workoutsBetween(user.id, today, today)]);
  const plan = generateWorkoutPlan(profile);
  const trainingToday = plan.some((s) => s.weekday === weekdayOf(today)) || workouts.length > 0;
  const workoutMin = workouts.reduce((a, w) => a + w.durationMin, 0);
  const extra = workouts.length ? Math.round(((workoutMin / 60) * 500) / 50) * 50 : trainingToday ? targets.waterTrainingExtra : 0;
  const goal = targets.water + extra;

  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((d) => ({ date: d, ml: logs.filter((l) => l.date === d).reduce((a, l) => a + l.ml, 0) }));

  return (
    <>
      <PageHeader title="Hidratação" subtitle="Meta calculada pelo seu peso, idade, clima, treino do dia e condições de saúde." icon={<Droplets size={22} />} />
      <WaterTracker
        today={today}
        goal={goal}
        base={targets.water}
        extra={extra}
        profile={profile}
        timezone={user.timezone}
        todayLogs={logs.filter((l) => l.date === today).map((l) => ({ id: l.id, ml: l.ml, at: l.createdAt.toISOString() }))}
        days={days}
      />
    </>
  );
}
