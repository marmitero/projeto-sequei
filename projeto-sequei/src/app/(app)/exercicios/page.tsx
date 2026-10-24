import { Dumbbell } from "lucide-react";
import { getContext, workoutsBetween } from "@/lib/data";
import { addDays } from "@/lib/calc";
import { PageHeader } from "@/components/ui";
import WorkoutPlanner from "./WorkoutPlanner";

export default async function ExerciciosPage() {
  const { user, profile, today } = await getContext();
  const logs = await workoutsBetween(user.id, addDays(today, -60), today);
  return (
    <>
      <PageHeader title="Treinos" subtitle="Plano semanal montado para seu objetivo, nível, local, equipamentos e lesões." icon={<Dumbbell size={22} />} />
      <WorkoutPlanner
        profile={profile}
        today={today}
        logs={logs.map((l) => ({ id: l.id, date: l.date, title: l.title, kind: l.kind, durationMin: l.durationMin, kcal: l.kcal, effort: l.effort, exercises: l.exercises, notes: l.notes }))}
      />
    </>
  );
}
