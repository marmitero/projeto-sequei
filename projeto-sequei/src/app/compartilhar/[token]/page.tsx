import { notFound } from "next/navigation";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { Leaf, Lock } from "lucide-react";
import { db } from "@/db";
import { metrics, planShares, users, waterLogs, workoutLogs, foodLogs } from "@/db/schema";
import { toProfile } from "@/lib/session";
import { GOALS, bmi, bmiClass, computeTargets, formatDateBR, todayIn, weeksToGoal } from "@/lib/calc";
import { clampTargets } from "@/lib/goalcoach";
import { generateWorkoutPlan, WEEKDAYS } from "@/lib/exercises";

export const dynamic = "force-dynamic";

export default async function SharedPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shares = await db
    .select()
    .from(planShares)
    .where(and(eq(planShares.token, token), isNull(planShares.revokedAt)))
    .limit(1);
  const share = shares[0];
  if (!share) notFound();

  const rows = await db.select().from(users).where(eq(users.id, share.userId)).limit(1);
  const user = rows[0];
  if (!user) notFound();

  const profile = toProfile(user);
  const targets = clampTargets(computeTargets(profile), profile.sex, user.targetOverrides);
  const plan = generateWorkoutPlan(profile);
  const today = todayIn(user.timezone);
  const weekAgo = new Date(Date.parse(today + "T12:00:00Z") - 6 * 86_400_000).toISOString().slice(0, 10);

  const [ms, foodDays, workouts, waters] = await Promise.all([
    db.select({ date: metrics.date, weightKg: metrics.weightKg }).from(metrics).where(eq(metrics.userId, user.id)).orderBy(desc(metrics.date)).limit(4),
    db.select({ date: foodLogs.date }).from(foodLogs).where(and(eq(foodLogs.userId, user.id), gte(foodLogs.date, weekAgo))),
    db.select({ date: workoutLogs.date, title: workoutLogs.title }).from(workoutLogs).where(and(eq(workoutLogs.userId, user.id), gte(workoutLogs.date, weekAgo))),
    db.select({ date: waterLogs.date, ml: waterLogs.ml }).from(waterLogs).where(and(eq(waterLogs.userId, user.id), gte(waterLogs.date, weekAgo))),
  ]);

  const imc = bmi(profile.weightKg, profile.heightCm);
  const weeks = weeksToGoal(profile, targets);
  const loggedDays = new Set(foodDays.map((f) => f.date)).size;
  const waterAvg = waters.length ? Math.round(waters.reduce((a, w) => a + w.ml, 0) / 7) : 0;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
          <Leaf size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black">FitVida</h1>
          <p className="text-xs text-slate-400">
            Plano compartilhado por {user.name}
            {share.label ? ` · ${share.label}` : ""} · somente leitura
          </p>
        </div>
        <span className="ml-auto flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-100/10 dark:text-slate-300">
          <Lock size={12} /> Visualização
        </span>
      </header>

      <section className="card p-5">
        <h2 className="font-bold">Resumo</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Objetivo", GOALS[profile.goal]?.label ?? profile.goal],
            ["Peso atual", `${profile.weightKg} kg`],
            ["Peso meta", `${profile.targetWeightKg} kg`],
            ["Projeção", weeks != null ? `${weeks} semana(s)` : "—"],
            ["Altura", `${profile.heightCm} cm`],
            ["IMC", `${imc.toFixed(1)} (${bmiClass(imc)})`],
            ["Água/dia", `${targets.water} ml`],
            ["Calorias/dia", `${targets.kcal} kcal`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-100/5">
              <div className="text-[11px] text-slate-400">{k}</div>
              <div className="text-sm font-bold">{v}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-bold">Metas diárias</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Proteína", `${targets.protein} g`],
            ["Carboidratos", `${targets.carbs} g`],
            ["Gorduras", `${targets.fat} g`],
            ["Fibras", `${targets.fiber} g`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-100/5">
              <div className="text-[11px] text-slate-400">{k}</div>
              <div className="text-sm font-bold">{v}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-bold">Plano de treino da semana</h2>
        <ul className="mt-3 space-y-2">
          {plan.map((s) => (
            <li key={s.weekday} className="flex items-start gap-3 rounded-2xl border border-slate-200 p-3">
              <div className="w-24 shrink-0 text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">{WEEKDAYS[s.weekday - 1]}</div>
              <div>
                <div className="text-sm font-semibold">
                  {s.title} · {s.focus} · {s.minutes} min
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {s.exercises
                    .slice(0, 3)
                    .map((e) => e.name)
                    .join(" · ")}
                  {s.exercises.length > 3 ? " …" : ""}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="font-bold">Últimos 7 dias</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-100/5">
            <div className="text-2xl font-black tabular-nums">{loggedDays}/7</div>
            <div className="text-[11px] text-slate-400">dias com refeições registradas</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-100/5">
            <div className="text-2xl font-black tabular-nums">{workouts.length}</div>
            <div className="text-[11px] text-slate-400">treinos registrados</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-100/5">
            <div className="text-2xl font-black tabular-nums">{waterAvg}</div>
            <div className="text-[11px] text-slate-400">ml de água/dia (média)</div>
          </div>
        </div>
        {ms.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-500">Evolução de peso</div>
            <ul className="mt-2 space-y-1">
              {[...ms].reverse().map((m) => (
                <li key={m.date} className="flex justify-between rounded-xl px-3 py-1.5 text-sm odd:bg-slate-50 dark:odd:bg-slate-100/5">
                  <span className="text-slate-500">{formatDateBR(m.date)}</span>
                  <span className="font-semibold tabular-nums">{m.weightKg} kg</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <footer className="pb-6 text-center text-xs text-slate-400">
        Link de visualização gerado em {formatDateBR(share.createdAt.toISOString().slice(0, 10))} · sem acesso a dados pessoais de conta
      </footer>
    </main>
  );
}
