"use client";

import { useT } from "@/lib/i18n";

import { useMemo, useState, useTransition } from "react";
import { Check, Clock, Flame, Info, Plus, RefreshCw, Trash2, X, Activity, Footprints, ShieldCheck, History } from "lucide-react";
import { generateWorkoutPlan, kcalFromMet, ACTIVITY_METS, WEEKDAYS, INJURY_LABELS, type PlannedSession } from "@/lib/exercises";
import { addDays, formatDateBR, weekdayOf, type Profile } from "@/lib/calc";
import { logWorkout, deleteWorkout } from "@/app/actions";
import type { WorkoutExercise } from "@/db/schema";
import ProgressionPanel from "./ProgressionPanel";
import { BarChart, Empty, Stat, fmt } from "@/components/ui";

type Log = { id: number; date: string; title: string; kind: string; durationMin: number; kcal: number; effort: number; exercises: WorkoutExercise[]; notes: string };

const SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function WorkoutPlanner({ profile, today, logs }: { profile: Profile; today: string; logs: Log[] }) {
  const t = useT();
  const [variant, setVariant] = useState(0);
  const plan = useMemo(() => generateWorkoutPlan(profile, variant), [profile, variant]);
  const wdToday = weekdayOf(today);
  const mondayOffset = (wdToday + 6) % 7;
  const weekStart = addDays(today, -mondayOffset);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [selDay, setSelDay] = useState(wdToday);
  const session = plan.find((s) => s.weekday === selDay) ?? null;
  const [logOpen, setLogOpen] = useState<null | { session: PlannedSession | null }>(null);
  const [pending, start] = useTransition();

  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const minutesByDay = last7.map((d) => ({ x: SHORT[weekdayOf(d)], y: logs.filter((l) => l.date === d).reduce((a, l) => a + l.durationMin, 0) }));
  const weekLogs = logs.filter((l) => l.date >= weekStart);
  const weekKcal = weekLogs.reduce((a, l) => a + l.kcal, 0);
  const weekMin = weekLogs.reduce((a, l) => a + l.durationMin, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="wp.weekWorkouts" value={`${weekLogs.length}/${profile.trainingDays}`} icon={<Activity size={16} />} tone="amber" />
        <Stat label="wp.activeMinutes" value={fmt(weekMin)} sub={t("wp.whoGoal")} icon={<Clock size={16} />} tone="sky" />
        <Stat label="wp.kcalBurned" value={fmt(weekKcal)} sub={t("wp.thisWeek")} icon={<Flame size={16} />} tone="rose" />
        <Stat label="wp.split" value={t(profile.trainingDays <= 3 ? "wp.fullBody" : profile.trainingDays === 4 ? "wp.upperLower" : "wp.ppl")} sub={`${profile.sessionMinutes} ${t("wp.perSession")}`} icon={<Dumbbell2 />} tone="emerald" />
      </div>

      {/* Semana */}
      <div className="card p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">{t("wp.yourWeek")}</h2>
          <button className="btn-ghost !py-2 text-xs" onClick={() => setVariant((v) => v + 1)}>
            <RefreshCw size={14} /> {t("wp.shuffle")}
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {weekDates.map((d) => {
            const wd = weekdayOf(d);
            const s = plan.find((p) => p.weekday === wd);
            const done = logs.some((l) => l.date === d);
            const on = selDay === wd;
            return (
              <button
                key={d}
                onClick={() => setSelDay(wd)}
                className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2.5 transition ${on ? "border-emerald-500 bg-emerald-50" : "border-transparent bg-slate-50 hover:bg-slate-100"} ${d === today ? "ring-2 ring-emerald-200" : ""}`}
              >
                <span className="text-[11px] font-semibold uppercase text-slate-500">{SHORT[wd]}</span>
                <span className="text-sm font-bold">{d.slice(8)}</span>
                <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] ${done ? "bg-emerald-500 text-white" : s ? "bg-orange-100 text-orange-600" : "bg-slate-200 text-slate-400"}`}>
                  {done ? <Check size={12} /> : s ? "🏋" : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sessão */}
        <div className="card p-5 sm:p-6 lg:col-span-2">
          {session ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">{t(WEEKDAYS[session.weekday])}</div>
                  <h2 className="text-2xl font-bold">{session.title}</h2>
                  <p className="text-sm text-slate-500">{session.focus}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={13} /> {session.minutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame size={13} /> ~{session.kcal} kcal
                    </span>
                    <span>{session.exercises.length} exercícios</span>
                  </div>
                </div>
                <button className="btn-primary" onClick={() => setLogOpen({ session })}>
                  <Check size={16} /> {t("wp.logWorkout")}
                </button>
              </div>
              {profile.injuries.length > 0 && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl bg-sky-50 p-3 text-sm text-sky-800 dark:text-sky-300">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                  {t("wp.riskNote", { list: profile.injuries.map((i) => t(INJURY_LABELS[i]).toLowerCase()).join(", ") })}
                </div>
              )}
              <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:text-amber-200">
                <b>{t("wp.warmup")}:</b> {session.warmup}
              </div>
              <ol className="mt-4 space-y-2">
                {session.exercises.map((e, i) => (
                  <li key={e.id} className="rounded-2xl border border-slate-200 p-3">
                    <details>
                      <summary className="flex cursor-pointer list-none items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-900 text-sm font-bold text-white">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">{e.name}</div>
                          <div className="text-xs text-slate-500">{e.muscle}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold tabular-nums">
                            {e.sets} × {e.reps}
                          </div>
                          <div className="text-[11px] text-slate-500">desc. {e.rest}</div>
                        </div>
                        <Info size={16} className="shrink-0 text-slate-400" />
                      </summary>
                      <p className="mt-2 rounded-xl bg-slate-50 p-2.5 text-sm text-slate-600">💡 {e.tip}</p>
                    </details>
                  </li>
                ))}
              </ol>
              {session.cardio && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-orange-50 to-rose-50 p-4">
                  <Footprints className="text-orange-500" />
                  <div>
                    <div className="font-semibold">
                      {t("wp.cardio")}: {t(session.cardio.label)} · {session.cardio.minutes} min
                    </div>
                    <div className="text-xs text-slate-600">{t(session.cardio.desc)}</div>
                  </div>
                </div>
              )}
              <p className="mt-4 text-xs text-slate-500">
                Progressão: quando completar todas as séries no topo da faixa de repetições com boa técnica, aumente a carga em 2–5%.
              </p>
            </>
          ) : (
            <Empty icon={<span className="text-2xl">🧘</span>} title={`${t(WEEKDAYS[selDay])}: ${t("wp.restDay")}`} text={t("wp.restTip")} />
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="mb-1 font-bold">{t("wp.looseActivity")}</h3>
            <p className="mb-3 text-xs text-slate-500">Futebol, yoga, corrida... calculamos o gasto pelo seu peso ({profile.weightKg} kg).</p>
            <button className="btn-outline w-full" onClick={() => setLogOpen({ session: null })}>
              <Plus size={16} /> {t("wp.logActivity")}
            </button>
          </div>
          <div className="card p-5">
            <h3 className="mb-2 font-bold">{t("wp.minutes7")}</h3>
            <BarChart data={minutesByDay} color="#fb923c" unit=" min" />
          </div>
        </div>
      </div>

      <ProgressionPanel logs={logs} today={today} />

      {/* Histórico */}
      <div className="card p-5 sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 font-bold">
          <History size={18} /> {t("wp.history")}
        </h2>
        {logs.length ? (
          <div className="divide-y divide-slate-100">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center gap-3 py-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-lg">{{ forca: "🏋️", cardio: "🏃", mobilidade: "🧘", esporte: "⚽" }[l.kind] ?? "💪"}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{t(l.title)}</div>
                  <div className="text-xs text-slate-500">
                    {formatDateBR(l.date, { weekday: "short", day: "2-digit", month: "short" })} · {l.durationMin} min · esforço {l.effort}/10
                    {l.exercises.length > 0 && ` · ${l.exercises.filter((e) => e.done !== false).length} exercícios`}
                  </div>
                </div>
                <div className="text-right text-sm font-bold text-orange-600">{fmt(l.kcal)} kcal</div>
                <button className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400" disabled={pending} onClick={() => start(() => deleteWorkout(l.id))} aria-label={t("common.remove")}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Empty icon={<Activity size={20} />} title={t("wp.noWorkouts")} text="Registre seu primeiro treino para acompanhar sua consistência." />
        )}
      </div>

      {logOpen && <LogModal profile={profile} today={today} session={logOpen.session} onClose={() => setLogOpen(null)} />}
    </div>
  );
}

function Dumbbell2() {
  return <span className="text-sm">🏋️</span>;
}

function LogModal({ profile, today, session, onClose }: { profile: Profile; today: string; session: PlannedSession | null; onClose: () => void }) {  const t = useT();

  const [date, setDate] = useState(today);
  const [activity, setActivity] = useState(session ? (profile.goal === "perder" ? "musculacao_intensa" : "musculacao") : "caminhada");
  const [minutes, setMinutes] = useState(session?.minutes ?? 30);
  const [effort, setEffort] = useState(7);
  const [notes, setNotes] = useState("");
  const [ex, setEx] = useState<WorkoutExercise[]>(session ? session.exercises.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, load: "", done: true })) : []);
  const [pending, start] = useTransition();
  const act = ACTIVITY_METS.find((a) => a.key === activity)!;
  const effortMult = 0.8 + effort * 0.04;
  let kcal = kcalFromMet(act.met * effortMult, profile.weightKg, minutes);
  if (session?.cardio) kcal += 0; // cardio já incluso na duração

  const save = () =>
    start(async () => {
      await logWorkout({ date, title: session ? session.title : act.label, kind: session ? "forca" : act.kind, durationMin: minutes, kcal, effort, exercises: ex, notes });
      onClose();
    });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white dark:bg-slate-100 animate-fade-up sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div className="font-bold">{session ? t("wp.logSession", { title: session.title }) : t("wp.logActivity")}</div>
          <button className="btn-ghost !p-2" onClick={onClose} aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t("mp.date")}</label>
              <input type="date" className="input" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">{t("wp.duration")}</label>
              <input type="number" className="input" value={minutes} onChange={(e) => setMinutes(Math.max(1, Number(e.target.value)))} />
            </div>
          </div>
          <div>
            <label className="label">{t("wp.activityType")}</label>
            <select className="input" value={activity} onChange={(e) => setActivity(e.target.value)}>
              {ACTIVITY_METS.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label} (MET {a.met})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Esforço percebido: {effort}/10</label>
            <input type="range" min={1} max={10} value={effort} onChange={(e) => setEffort(Number(e.target.value))} className="w-full accent-emerald-600" />
          </div>
          {ex.length > 0 && (
            <div>
              <label className="label">{t("wp.exercisesLoads")}</label>
              <div className="space-y-2">
                {ex.map((e, i) => (
                  <div key={i} className={`flex items-center gap-2 rounded-xl border p-2 ${e.done ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200"}`}>
                    <button onClick={() => setEx(ex.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${e.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`} aria-label={t("wp.done")}>
                      {e.done && <Check size={14} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{e.name}</div>
                      <div className="text-xs text-slate-500">
                        {e.sets} × {e.reps}
                      </div>
                    </div>
                    <input className="input !w-24 !py-1.5 text-sm" placeholder={t("wp.loadPh")} value={e.load} onChange={(ev) => setEx(ex.map((x, j) => (j === i ? { ...x, load: ev.target.value } : x)))} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="label">{t("mp.notes")}</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("wp.notesPh")} />
          </div>
        </div>
        <div className="border-t border-slate-100 p-4">
          <div className="mb-2 text-center text-sm text-slate-500">
            {t("wp.estBurn")}: <b className="text-orange-600">{kcal} {t("common.kcal")}</b>
          </div>
          <button className="btn-primary w-full !py-3" disabled={pending} onClick={save}>
            {t(pending ? "mp.saving" : "wp.saveWorkout")}
          </button>
        </div>
      </div>
    </div>
  );
}
