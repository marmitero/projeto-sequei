"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Clock, Info, GlassWater, CupSoda, Coffee, Milk } from "lucide-react";
import { addWater, deleteWater } from "@/app/actions";
import { ageFrom, formatDateBR, weekdayOf, type Profile } from "@/lib/calc";
import { BarChart, fmt } from "@/components/ui";

const QUICK = [
  { ml: 150, label: "Copo pequeno", icon: Coffee },
  { ml: 250, label: "Copo", icon: GlassWater },
  { ml: 350, label: "Caneca", icon: Milk },
  { ml: 500, label: "Garrafa", icon: CupSoda },
];
const SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [timezone]);

  const schedule = useMemo(() => {
    const wake = toMin(profile.wakeTime);
    let sleep = toMin(profile.sleepTime);
    if (sleep <= wake) sleep += 24 * 60;
    const end = sleep - 60;
    const span = Math.max(end - wake, 6 * 60);
    const n = Math.min(Math.max(Math.round(span / 90), 6), 12);
    const per = Math.round(goal / n / 10) * 10;
    let acc = 0;
    return Array.from({ length: n }, (_, i) => {
      const t = wake + Math.round((span / (n - 1)) * i);
      const ml = i === n - 1 ? goal - per * (n - 1) : per;
      acc += ml;
      let note = "";
      if (i === 0) note = "Ao acordar — reidrata após a noite";
      const trainMin = profile.trainingTime === "manha" ? wake + 90 : profile.trainingTime === "tarde" ? 15 * 60 : 19 * 60;
      if (extra > 0 && Math.abs(t - trainMin) < span / n / 1.5) note = "Perto do treino — beba em goles durante a sessão";
      return { time: toHHMM(t), minute: t, ml, cumulative: acc, note };
    });
  }, [profile, goal, extra]);

  const age = ageFrom(profile.birthDate);
  const tips: string[] = [
    `Base: ${age > 55 ? 30 : 35} ml × ${profile.weightKg} kg${profile.climate === "quente" ? " + 500 ml pelo clima quente" : ""} = ${fmt(base)} ml.`,
  ];
  if (extra) tips.push(`Dia de treino: +${extra} ml (≈500 ml por hora de exercício).`);
  if (profile.healthConditions.includes("gestante")) tips.push("Gestação: +300 ml incluídos na sua meta.");
  if (profile.healthConditions.includes("lactante")) tips.push("Amamentação: +700 ml incluídos — beba um copo a cada mamada.");
  if (profile.healthConditions.includes("renal")) tips.push("⚠ Doença renal: siga a restrição hídrica indicada pelo seu nefrologista.");
  if (age > 55) tips.push("Com a idade a sede diminui: siga o cronograma mesmo sem sentir sede.");
  tips.push("Urina amarelo-clara é o melhor sinal de boa hidratação.");

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
                <span className={`text-2xl font-black ${pct > 0.5 ? "text-white" : "text-sky-700"}`}>{Math.round((total / goal) * 100)}%</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hoje</div>
              <div className="text-4xl font-black tabular-nums text-sky-700">{(total / 1000).toFixed(2).replace(".", ",")}L</div>
              <div className="text-sm text-slate-500">meta {(goal / 1000).toFixed(2).replace(".", ",")} L</div>
              <div className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-800">{total >= goal ? "🎉 Meta batida!" : `Faltam ${fmt(goal - total)} ml`}</div>
              {streak > 0 && <div className="mt-2 text-sm font-semibold text-orange-600">🔥 {streak} dia(s) seguidos na meta</div>}
            </div>
          </div>
        </div>

        {/* Registro rápido */}
        <div className="card p-5 sm:p-6 lg:col-span-3">
          <h2 className="mb-3 font-bold">Registro rápido</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {QUICK.map((q) => {
              const Icon = q.icon;
              return (
                <button key={q.ml} disabled={pending} onClick={() => add(q.ml)} className="group flex flex-col items-center gap-1 rounded-2xl border-2 border-sky-100 bg-sky-50/50 p-4 transition hover:border-sky-400 hover:bg-sky-50 active:scale-95">
                  <Icon size={26} className="text-sky-500 transition group-hover:scale-110" />
                  <span className="text-lg font-bold text-sky-800">{q.ml} ml</span>
                  <span className="text-xs text-slate-500">{q.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <input type="number" inputMode="numeric" className="input" placeholder="Outro volume (ml)" value={custom} onChange={(e) => setCustom(e.target.value)} />
            <button
              className="btn-primary shrink-0"
              disabled={!custom || pending}
              onClick={() => {
                add(Number(custom));
                setCustom("");
              }}
            >
              <Plus size={16} /> Adicionar
            </button>
          </div>
          {todayLogs.length > 0 && (
            <div className="mt-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Registros de hoje</div>
              <div className="flex flex-wrap gap-2">
                {todayLogs.map((l) => (
                  <span key={l.id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm">
                    {new Date(l.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: timezone })} · {l.ml} ml
                    <button className="rounded-full p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600" onClick={() => start(() => deleteWater(l.id))} aria-label="Remover">
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
            <Clock size={18} className="text-sky-500" /> Seu cronograma de hoje
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Do seu despertar ({profile.wakeTime}) até 1 h antes de dormir ({profile.sleepTime}).
          </p>
          <ol className="relative space-y-2 border-l-2 border-sky-100 pl-5">
            {schedule.map((s, i) => {
              const done = total >= s.cumulative;
              const isNow = nowMin !== null && !done && nowMin >= s.minute - 45 && (i === schedule.length - 1 || nowMin < schedule[i + 1].minute);
              const late = nowMin !== null && !done && nowMin > s.minute + 45;
              return (
                <li key={i} className="relative">
                  <span className={`absolute -left-[29px] top-2 grid h-4 w-4 place-items-center rounded-full border-2 ${done ? "border-emerald-500 bg-emerald-500" : isNow ? "border-sky-500 bg-white" : "border-slate-300 bg-white"}`} />
                  <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${isNow ? "bg-sky-50 ring-2 ring-sky-200" : done ? "bg-emerald-50/50" : ""}`}>
                    <div>
                      <span className="font-mono text-sm font-bold">{s.time}</span>
                      <span className={`ml-2 text-sm ${done ? "text-emerald-700 line-through decoration-emerald-300" : "text-slate-700"}`}>{s.ml} ml</span>
                      {s.note && <div className="text-[11px] text-slate-500">{s.note}</div>}
                    </div>
                    {done ? <span className="text-xs font-semibold text-emerald-600">✓ feito</span> : isNow ? <button className="btn-primary !px-2.5 !py-1 text-xs" onClick={() => add(s.ml)}>Beber agora</button> : late ? <span className="text-xs text-amber-600">atrasado</span> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="space-y-4">
          <div className="card p-5 sm:p-6">
            <h2 className="mb-2 font-bold">Últimos 7 dias</h2>
            <BarChart data={days.map((d) => ({ x: SHORT[weekdayOf(d.date)], y: d.ml }))} target={goal} unit=" ml" />
            <div className="mt-2 text-center text-xs text-slate-500">
              Média: {fmt(days.reduce((a, d) => a + d.ml, 0) / 7)} ml/dia · barras verdes = meta atingida · {formatDateBR(days[0].date)} a {formatDateBR(days[6].date)}
            </div>
          </div>
          <div className="card p-5 sm:p-6">
            <h2 className="mb-2 flex items-center gap-2 font-bold">
              <Info size={18} className="text-sky-500" /> Como calculamos sua meta
            </h2>
            <ul className="space-y-1.5 text-sm text-slate-600">
              {tips.map((t) => (
                <li key={t}>• {t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
