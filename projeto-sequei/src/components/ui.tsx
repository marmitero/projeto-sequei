"use client";

import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { fmt } from "@/lib/format";

export function Ring({
  value,
  max,
  size = 120,
  stroke = 12,
  color = "#10b981",
  track = "#e2e8f0",
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const over = max > 0 && value > max * 1.05;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={over ? "#f43f5e" : color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset .6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Bar({ value, max, color = "bg-emerald-500", h = "h-2" }: { value: number; max: number; color?: string; h?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const over = max > 0 && value > max * 1.1;
  return (
    <div className={`w-full overflow-hidden rounded-full bg-slate-100 ${h}`}>
      <div className={`${h} rounded-full ${over ? "bg-rose-500" : color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export const MACRO_COLORS = {
  protein: { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", hex: "#f43f5e", soft: "bg-rose-50", label: "macro.protein" },
  carbs: { bar: "bg-amber-400", text: "text-amber-600 dark:text-amber-400", hex: "#f59e0b", soft: "bg-amber-50", label: "macro.carbs" },
  fat: { bar: "bg-sky-500", text: "text-sky-600 dark:text-sky-400", hex: "#0ea5e9", soft: "bg-sky-50", label: "macro.fat" },
  fiber: { bar: "bg-lime-500", text: "text-lime-700", hex: "#84cc16", soft: "bg-lime-50", label: "macro.fiber" },
};

// MacroRow/MacroPills (com rótulos traduzidos) ficam em ./Macros (client island).

export function PageHeader({ title, subtitle, icon, action }: { title: string; subtitle?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        {icon && <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">{icon}</div>}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, sub, icon, tone = "emerald" }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: string }) {
  const t = useT();
  const tones: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600 dark:text-emerald-400",
    sky: "bg-sky-50 text-sky-600 dark:text-sky-400",
    rose: "bg-rose-50 text-rose-600 dark:text-rose-400",
    amber: "bg-amber-50 text-amber-600 dark:text-amber-400",
    violet: "bg-violet-50 text-violet-600",
    cyan: "bg-cyan-50 text-cyan-600",
  };
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        {icon && <div className={`grid h-8 w-8 place-items-center rounded-xl ${tones[tone]}`}>{icon}</div>}
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(label)}</span>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{typeof sub === "string" ? t(sub) : sub}</div>}
    </div>
  );
}

export function LineChart({
  data,
  color = "#10b981",
  height = 180,
  target,
  unit = "",
}: {
  data: { x: string; y: number }[];
  color?: string;
  height?: number;
  target?: number;
  unit?: string;
}) {
  if (data.length === 0) return <div className="grid h-40 place-items-center text-sm text-slate-400">Sem dados ainda</div>;
  const W = 600;
  const H = height;
  const pad = { l: 40, r: 12, t: 14, b: 26 };
  const ys = data.map((d) => d.y).concat(target !== undefined ? [target] : []);
  let min = Math.min(...ys);
  let max = Math.max(...ys);
  if (max - min < 1) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  min -= span * 0.1;
  max += span * 0.1;
  const x = (i: number) => pad.l + (data.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (data.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.y)}`).join(" ");
  const area = `${path} L${x(data.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`;
  const ticks = [0, 0.5, 1].map((t) => min + (max - min) * t);
  const gid = `g${color.replace("#", "")}`;
  const step = Math.max(1, Math.ceil(data.length / 6));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray="4 4" />
          <text x={pad.l - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill="#94a3b8">
            {t.toFixed(t > 100 ? 0 : 1)}
          </text>
        </g>
      ))}
      {target !== undefined && (
        <g>
          <line x1={pad.l} x2={W - pad.r} y1={y(target)} y2={y(target)} stroke="#6366f1" strokeWidth="1.5" strokeDasharray="6 4" />
          <text x={W - pad.r} y={y(target) - 5} fontSize="11" textAnchor="end" fill="#6366f1">
            meta {target}
            {unit}
          </text>
        </g>
      )}
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.y)} r="3.5" fill="white" stroke={color} strokeWidth="2">
            <title>
              {d.x}: {d.y}
              {unit}
            </title>
          </circle>
          {i % step === 0 || i === data.length - 1 ? (
            <text x={x(i)} y={H - 8} fontSize="11" textAnchor="middle" fill="#94a3b8">
              {d.x}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

export function BarChart({ data, target, color = "#06b6d4", height = 160, unit = "" }: { data: { x: string; y: number }[]; target?: number; color?: string; height?: number; unit?: string }) {
  const W = 600;
  const H = height;
  const pad = { l: 8, r: 8, t: 16, b: 24 };
  const max = Math.max(...data.map((d) => d.y), target ?? 0, 1) * 1.1;
  const bw = (W - pad.l - pad.r) / data.length;
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      {target !== undefined && <line x1={pad.l} x2={W - pad.r} y1={y(target)} y2={y(target)} stroke="#6366f1" strokeDasharray="6 4" strokeWidth="1.5" />}
      {data.map((d, i) => {
        const hit = target !== undefined && d.y >= target;
        return (
          <g key={i}>
            <rect x={pad.l + i * bw + bw * 0.18} y={y(d.y)} width={bw * 0.64} height={Math.max(H - pad.b - y(d.y), 0)} rx="8" fill={hit ? "#10b981" : color} opacity={d.y ? 1 : 0.25}>
              <title>
                {d.x}: {d.y}
                {unit}
              </title>
            </rect>
            <text x={pad.l + i * bw + bw / 2} y={H - 7} fontSize="12" textAnchor="middle" fill="#94a3b8">
              {d.x}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Empty({ icon, title, text }: { icon: ReactNode; title: string; text?: string }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">{icon}</div>
      <div className="font-semibold text-slate-700">{t(title)}</div>
      {text && <div className="max-w-xs text-sm text-slate-500">{t(text)}</div>}
    </div>
  );
}

export { fmt };
