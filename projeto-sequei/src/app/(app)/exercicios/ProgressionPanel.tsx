"use client";

import { useMemo, useState, useTransition } from "react";
import { LineChart, TrendingUp, ThumbsUp, Dumbbell } from "lucide-react";
import { progressionFor, type LoadPoint } from "@/lib/progression";
import { formatDateBR } from "@/lib/calc";
import type { WorkoutExercise } from "@/db/schema";
import { logWorkout } from "@/app/actions";

type Log = { id: number; date: string; title: string; kind: string; durationMin: number; kcal: number; effort: number; exercises: WorkoutExercise[]; notes: string };

/** Gráfico simples de carga ao longo das sessões. */
function LoadChart({ series }: { series: LoadPoint[] }) {
  const pts = series.filter((p) => p.loadKg != null) as { date: string; loadKg: number }[];
  if (pts.length < 2) {
    return <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">Registre a carga em pelo menos 2 sessões para ver o gráfico.</div>;
  }
  const w = 560;
  const h = 180;
  const pad = 28;
  const ys = pts.map((p) => p.loadKg);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxY - minY, 2);
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(pts.length - 1, 1);
  const y = (v: number) => h - pad - ((v - minY) / span) * (h - pad * 2);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.loadKg).toFixed(1)}`).join(" ");

  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Carga por sessão">
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#cbd5e1" strokeWidth="1" />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#cbd5e1" strokeWidth="1" />
        <path d={path} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={p.date + i}>
            <circle cx={x(i)} cy={y(p.loadKg)} r="4.5" fill="#059669" />
            <text x={x(i)} y={y(p.loadKg) - 10} textAnchor="middle" className="fill-slate-600 text-[11px]">
              {String(p.loadKg).replace(".", ",")}
            </text>
            <text x={x(i)} y={h - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">
              {p.date.slice(8)}/{p.date.slice(5, 7)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function ProgressionPanel({ logs, today }: { logs: Log[]; today: string }) {
  const names = useMemo(() => {
    const s = new Set<string>();
    for (const l of logs) for (const e of l.exercises) if (e.name) s.add(e.name);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [logs]);

  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [doneMsg, setDoneMsg] = useState("");
  const selected = name || names[0] || "";
  const prog = useMemo(() => progressionFor(logs, selected), [logs, selected]);

  if (!names.length) {
    return (
      <div className="card p-5 sm:p-6">
        <h2 className="mb-2 flex items-center gap-2 font-bold">
          <LineChart size={18} /> Progressão de força
        </h2>
        <p className="text-sm text-slate-500">Registre treinos com carga (ex.: “40 kg”) para acompanhar sua evolução por exercício.</p>
      </div>
    );
  }

  const sug = prog.suggestion;
  const nextKg = sug.nextKg;

  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold">
          <LineChart size={18} className="text-emerald-600" /> Progressão de força
        </h2>
        <select className="input !w-auto !py-2 text-sm" value={selected} onChange={(e) => setName(e.target.value)} aria-label="Exercício">
          {names.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <LoadChart series={prog.series} />

      <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-start gap-2">
          <TrendingUp size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-emerald-900">
              Sugestão: {sug.action === "increase" ? "progredir carga" : sug.action === "maintain" ? "manter carga" : sug.action === "deload" ? "aliviar (deload)" : "sem sugestão ainda"}
            </div>
            <p className="mt-0.5 text-sm text-emerald-800">{sug.text}</p>
          </div>
        </div>
        {sug.action !== "none" && nextKg != null && (
          <button
            className="btn-primary mt-3 !py-2.5"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await logWorkout({
                  date: today,
                  title: `${selected} — ${sug.action === "increase" ? "progressão" : sug.action === "deload" ? "deload" : "manutenção"}`,
                  kind: "forca",
                  durationMin: 45,
                  kcal: 0,
                  effort: sug.action === "increase" ? 8 : 7,
                  exercises: [{ name: selected, sets: 3, reps: "8-10", load: `${String(nextKg).replace(".", ",")} kg` }],
                  notes: "Registrado pela sugestão de progressão.",
                });
                setDoneMsg("Sessão registrada!");
                setTimeout(() => setDoneMsg(""), 1800);
              })
            }
          >
            <ThumbsUp size={16} /> {doneMsg || `Fiz isso — registrar ${String(nextKg).replace(".", ",")} kg hoje`}
          </button>
        )}
      </div>

      <div className="mt-3">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Últimas sessões</div>
        <div className="divide-y divide-slate-100">
          {[...prog.series].reverse().slice(0, 5).map((p, i) => (
            <div key={p.date + i} className="flex items-center gap-3 py-2 text-sm">
              <Dumbbell size={14} className="text-slate-300" />
              <span className="w-24 text-slate-500">{formatDateBR(p.date, { day: "2-digit", month: "short" })}</span>
              <span className="font-medium">{p.loadKg != null ? `${String(p.loadKg).replace(".", ",")} kg` : "sem carga"}</span>
              <span className="text-slate-500">
                {p.sets}×{p.reps}
              </span>
              <span className="ml-auto text-xs text-slate-400">esforço {p.effort}/10</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
