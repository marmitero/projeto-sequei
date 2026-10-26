"use client";

import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { ArrowDownRight, ArrowUpRight, CalendarRange, Droplets, Dumbbell, Scale, Utensils } from "lucide-react";
import { formatDateBR } from "@/lib/calc";
import { pctDelta, type WeeklyReport } from "@/lib/weekly";

function Delta({ cur, prev, unit, invert = false }: { cur: number; prev: number; unit: string; invert?: boolean }) {
  const d = pctDelta(cur, prev);
  if (d === null || d === 0) return <span className="text-xs text-slate-400">—</span>;
  const up = d > 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
      <Icon size={13} /> {Math.abs(d)}% {unit}
    </span>
  );
}

function StatCard({ icon, label, value, sub, delta }: { icon: ReactNode; label: string; value: string; sub?: string; delta?: React.ReactNode }) {
  const t = useT();
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {icon} {t(label)}
      </div>
      <div className="mt-1.5 text-2xl font-black tabular-nums">{value}</div>
      <div className="mt-0.5 flex items-center gap-2">
        {sub && <span className="text-xs text-slate-500">{sub}</span>}
        {delta}
      </div>
    </div>
  );
}

function TrendBars({ values, unit, fmtV }: { values: number[]; unit: string; fmtV: (n: number) => string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1.5">
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="w-full rounded-t-lg bg-emerald-400" style={{ height: `${Math.max((v / max) * 56, 3)}px` }} title={`${fmtV(v)} ${unit}`} />
          <span className="text-[10px] text-slate-400">S{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

/** Relatório semanal + tendências (últimas 4 semanas). Componente puramente de apresentação. */
export default function WeeklySection({ report }: { report: WeeklyReport }) {
  const t = useT();
  const c = report.current;
  const p = report.previous;
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarRange size={18} className="text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-xl font-bold">{t("week.title")}</h2>
        <span className="ml-auto text-xs text-slate-400">
          {formatDateBR(c.from, { day: "2-digit", month: "short" })} – {formatDateBR(c.to, { day: "2-digit", month: "short" })}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Utensils size={13} />}
          label="week.kcalDay"
          value={c.daysLogged ? String(c.avgKcal) : "—"}
          delta={<Delta cur={c.avgKcal} prev={p.avgKcal} unit="vs. sem. ant." invert />}
        />
        <StatCard
          icon={<Dumbbell size={13} />}
          label="week.workouts"
          value={String(c.workouts)}
          sub="na semana"
          delta={<Delta cur={c.workouts} prev={p.workouts} unit="vs. sem. ant." />}
        />
        <StatCard
          icon={<Droplets size={13} />}
          label="week.hydration"
          value={`${c.waterDays} dia${c.waterDays === 1 ? "" : "s"}`}
          sub={`${c.avgWater} ml/dia`}
        />
        <StatCard
          icon={<Scale size={13} />}
          label="Peso"
          value={c.weightChangeKg === null ? "—" : `${c.weightChangeKg > 0 ? "+" : ""}${String(c.weightChangeKg).replace(".", ",")} kg`}
          sub="na semana"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("week.trendKcal")}</div>
          <TrendBars values={report.trends.map((t) => t.avgKcal)} unit="kcal" fmtV={(n) => String(Math.round(n))} />
        </div>
        <div className="card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("week.trendWorkouts")}</div>
          <TrendBars values={report.trends.map((t) => t.workouts)} unit="treinos" fmtV={(n) => String(n)} />
        </div>
      </div>

      {c.daysLogged === 0 && <p className="text-sm text-slate-500">{t("week.empty")}</p>}
    </section>
  );
}
