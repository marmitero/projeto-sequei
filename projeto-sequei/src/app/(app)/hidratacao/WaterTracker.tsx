"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Clock, Info, GlassWater, CupSoda, Coffee, Milk } from "lucide-react";
import { addWater, deleteWater } from "@/app/actions";
import { ageFrom, formatDateBR, weekdayOf, type Profile } from "@/lib/calc";
import { BarChart, fmt } from "@/components/ui";
import { useT, useLocale, type TFn } from "@/lib/i18n";

const QUICK = [
  { ml: 150, label: "water.cupSmall", icon: Coffee },
  { ml: 250, label: "water.cup", icon: GlassWater },
  { ml: 350, label: "water.mug", icon: Milk },
  { ml: 500, label: "water.bottle", icon: CupSoda },
];
const SHORT = ["dayShort.sun", "dayShort.mon", "dayShort.tue", "dayShort.wed", "dayShort.thu", "dayShort.fri", "dayShort.sat"];

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};
const toHHMM = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default function WaterTracker({
  today,
  goal,
  base,
  extra,
  profile,
  timezone,
  todayLogs,
  days,
}: {
  today: string;
  goal: number;
  base: number;
  extra: number;
  profile: Profile;
  timezone: string;
  todayLogs: { id: number; ml: number; at: string }[];
  days: { date: string; ml: number }[];
}) {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();
  const [custom, setCustom] = useState("");
  const [nowMin, setNowMin] = useState<number | null>(null);
  const total = todayLogs.reduce((a, l) => a + l.ml, 0);
  const pct = Math.min(total / goal, 1);

  useEffect(() => {
    const calc = () => {
      const parts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(new Date());
      setNowMin(toMin(parts));
    };
    calc();
    const timer = setInterval(calc, 60000);
    return () => clearInterval(timer);
  }, [timezone]);

  const schedule = useMemo(() => {
    const wake = toMin(profile.wakeTime);
    let sleep = toMin(profile.sleepTime);
    if (sleep <= wake) sleep += 24 * 60;
    const end = sleep - 60;
    const span = Math.max(end - wake, 6 * 60);
    const n = Math.min(Math.max(Math.round(span / 90), 6), 12);
    const per = Math.round(goal / n / 10) * 10;
    const items: { time: string; minute: number; ml: number; cumulative: number; noteKey: string }[] = [];
    for (let i = 0; i < n; i++) {
      const at = wake + Math.round((span / (n - 1)) * i);
      const ml = i === n - 1 ? goal - per * (n - 1) : per;
      const cumulative = items.reduce((a, x) => a + x.ml, ml);
      let noteKey = "";
      if (i === 0) noteKey = "water.noteWake";
      const trainMin = profile.trainingTime === "manha" ? wake + 90 : profile.trainingTime === "tarde" ? 15 * 60 : 19 * 60;
      if (extra > 0 && Math.abs(at - trainMin) < span / n / 1.5) noteKey = "water.noteTrain";
      items.push({ time: toHHMM(at), minute: at, ml, cumulative, noteKey });
    }
    return items;
  }, [profile, goal, extra]);

  const age = ageFrom(profile.birthDate);
  const tips: { key: string; vars?: Record<string, string | number> }[] = [
    { key: "water.tipBase", vars: { weight: profile.weightKg, age } },
  ];
  if (profile.climate === "quente") tips.push({ key: "water.tipClimate", vars: { climate: t(`climate.${{ quente: "hot", frio: "cold", ameno: "mild" }[profile.climate] ?? "mild"}`) } });
  if (extra) tips.push({ key: "water.tipWorkout", vars: { ml: extra } });
  if (profile.healthConditions.includes("gestante")) tips.push({ key: "water.tipPregnant" });
  if (profile.healthConditions.includes("lactante")) tips.push({ key: "water.tipNursing" });
  if (profile.healthConditions.includes("renal")) tips.push({ key: "water.tipRenal" });
  if (age > 55) tips.push({ key: "water.tipSenior", vars: { age } });
  tips.push({ key: "water.tipUrine" });

  const add = (ml: number) => start(() => addWater(today, ml));
  const streak = (() => {
    let s = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].ml >= goal * 0.9) s++;
      else if (i !== days.length - 1) break;
    }
    return s;
  })();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Garrafa */}
        <div className="card relative overflow-hidden p-6 lg:col-span-2">
          <div className="flex items-center gap-6">
            <div className="relative h-64 w-32 shrink-0 overflow-hidden rounded-[2.5rem] border-4 border-cyan-200 bg-cyan-50/50">
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-sky-600 to-cyan-400 transition-all duration-700" style={{ height: `${pct * 100}%` }}>
                <div className="absolute -top-2 left-0 right-0 h-4 animate-pulse rounded-[50%] bg-cyan-300/70" />
              </div>
              <div className="absolute inset-0 grid place-items-center">
                <span className={`text-2xl font-black ${pct > 0.5 ? "text-white" : "text-sky-700 dark:text-sky-300"}`}>{Math.round((total / goal) * 100)}%</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("common.today")}</div>
              <div className="text-4xl font-black tabular-nums text-sky-700 dark:text-sky-300">{(total / 1000).toFixed(2).replace(".", ",")}L</div>
              <div className="text-sm text-slate-500">{t("water.goal", { l: (goal / 1000).toFixed(2).replace(".", ",") })}</div>
              <div className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-800 dark:text-sky-300">{total >= goal ? t("water.goalHit") : t("water.remaining", { ml: fmt(goal - total) })}</div>
              {streak > 0 && <div className="mt-2 text-sm font-semibold text-orange-600">🔥 {t("water.streak", { n: streak })}</div>}
            </div>
          </div>
        </div>

        {/* Registro rápido */}
        <div className="card p-5 sm:p-6 lg:col-span-3">
          <h2 className="mb-3 font-bold">{t("water.quickLog")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {QUICK.map((q) => {
              const Icon = q.icon;
              return (
                <button key={q.ml} disabled={pending} onClick={() => add(q.ml)} className="group flex flex-col items-center gap-1 rounded-2xl border-2 border-sky-100 bg-sky-50/50 p-4 transition hover:border-sky-400 hover:bg-sky-50 active:scale-95">
                  <Icon size={26} className="text-sky-500 transition group-hover:scale-110" />
                  <span className="text-lg font-bold text-sky-800 dark:text-sky-300">{q.ml} ml</span>
                  <span className="text-xs text-slate-500">{t(q.label)}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <input type="number" inputMode="numeric" className="input" placeholder={t("water.otherVolume")} value={custom} onChange={(e) => setCustom(e.target.value)} />
            <button
              className="btn-primary shrink-0"
              disabled={!custom || pending}
              onClick={() => {
                add(Number(custom));
                setCustom("");
              }}
            >
              <Plus size={16} /> {t("common.add")}
            </button>
          </div>
          {todayLogs.length > 0 && (
            <div className="mt-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("water.todayLogs")}</div>
              <div className="flex flex-wrap gap-2">
                {todayLogs.map((l) => (
                  <span key={l.id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm">
                    {new Date(l.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: timezone })} · {l.ml} ml
                    <button className="rounded-full p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:text-rose-400" onClick={() => start(() => deleteWater(l.id))} aria-label={t("common.remove")}>
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Cronograma */}
        <div className="card p-5 sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 font-bold">
            <Clock size={18} className="text-sky-500" /> {t("water.schedule")}
          </h2>
          <p className="mb-4 text-xs text-slate-500">{t("water.scheduleSub", { wake: profile.wakeTime, sleep: profile.sleepTime })}</p>
          <ol className="relative space-y-2 border-l-2 border-sky-100 pl-5">
            {schedule.map((s, i) => {
              const done = total >= s.cumulative;
              const isNow = nowMin !== null && !done && nowMin >= s.minute - 45 && (i === schedule.length - 1 || nowMin < schedule[i + 1].minute);
              const late = nowMin !== null && !done && nowMin > s.minute + 45;
              return (
                <li key={i} className="relative">
                  <span className={`absolute -left-[29px] top-2 grid h-4 w-4 place-items-center rounded-full border-2 ${done ? "border-emerald-500 bg-emerald-500" : isNow ? "border-sky-500 bg-white dark:bg-slate-100" : "border-slate-300 bg-white dark:bg-slate-100"}`} />
                  <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${isNow ? "bg-sky-50 ring-2 ring-sky-200" : done ? "bg-emerald-50/50" : ""}`}>
                    <div>
                      <span className="font-mono text-sm font-bold">{s.time}</span>
                      <span className={`ml-2 text-sm ${done ? "text-emerald-700 dark:text-emerald-300 line-through decoration-emerald-300" : "text-slate-700"}`}>{s.ml} ml</span>
                      {s.noteKey && <div className="text-[11px] text-slate-500">{t(s.noteKey)}</div>}
                    </div>
                    {done ? <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ {t("water.done")}</span> : isNow ? <button className="btn-primary !px-2.5 !py-1 text-xs" onClick={() => add(s.ml)}>{t("water.drinkNow")}</button> : late ? <span className="text-xs text-amber-600 dark:text-amber-400">{t("water.late")}</span> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="space-y-4">
          <div className="card p-5 sm:p-6">
            <h2 className="mb-2 font-bold">{t("water.last7")}</h2>
            <BarChart data={days.map((d) => ({ x: t(SHORT[weekdayOf(d.date)]), y: d.ml }))} target={goal} unit=" ml" />
            <div className="mt-2 text-center text-xs text-slate-500">
              {t("water.avg", { ml: fmt(days.reduce((a, d) => a + d.ml, 0) / 7) })} · {t("water.greenHint")} · {formatDateBR(days[0].date, { day: "2-digit", month: "short" }, locale)} {t("common.to")} {formatDateBR(days[6].date, { day: "2-digit", month: "short" }, locale)}
            </div>
          </div>
          <div className="card p-5 sm:p-6">
            <h2 className="mb-2 flex items-center gap-2 font-bold">
              <Info size={18} className="text-sky-500" /> {t("water.howCalc")}
            </h2>
            <ul className="space-y-1.5 text-sm text-slate-600">
              {tips.map((tip) => (
                <li key={tip.key}>• {t(tip.key, tip.vars)}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
