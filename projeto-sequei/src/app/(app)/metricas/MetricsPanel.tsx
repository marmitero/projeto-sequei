"use client";

import { useMemo, useState, useTransition } from "react";
import { Save, Trash2, Scale, Ruler, Percent, HeartPulse, Moon, TrendingDown, TrendingUp, Target, CheckCircle2 } from "lucide-react";
import { saveMetric, deleteMetric, type MetricInput } from "@/app/actions";
import { bmi, bmiClass, navyBodyFat, formatDateBR, type Profile } from "@/lib/calc";
import { LineChart, Stat, Bar, fmt, Empty } from "@/components/ui";

type M = {
  id: number;
  date: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
  hipCm: number | null;
  neckCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  restingHr: number | null;
  sleepHours: number | null;
  notes: string;
};

const FIELDS: { k: keyof MetricInput; label: string; unit: string; step: string }[] = [
  { k: "weightKg", label: "Peso", unit: "kg", step: "0.1" },
  { k: "bodyFatPct", label: "% Gordura (bioimpedância)", unit: "%", step: "0.1" },
  { k: "waistCm", label: "Cintura", unit: "cm", step: "0.5" },
  { k: "hipCm", label: "Quadril", unit: "cm", step: "0.5" },
  { k: "neckCm", label: "Pescoço", unit: "cm", step: "0.5" },
  { k: "chestCm", label: "Peito", unit: "cm", step: "0.5" },
  { k: "armCm", label: "Braço", unit: "cm", step: "0.5" },
  { k: "thighCm", label: "Coxa", unit: "cm", step: "0.5" },
  { k: "sleepHours", label: "Sono (última noite)", unit: "h", step: "0.5" },
  { k: "restingHr", label: "FC repouso", unit: "bpm", step: "1" },
];

const CHARTS: { k: keyof M; label: string; color: string; unit: string }[] = [
  { k: "weightKg", label: "Peso", color: "#8b5cf6", unit: " kg" },
  { k: "bodyFatPct", label: "% Gordura", color: "#f43f5e", unit: "%" },
  { k: "waistCm", label: "Cintura", color: "#f59e0b", unit: " cm" },
  { k: "hipCm", label: "Quadril", color: "#ec4899", unit: " cm" },
  { k: "armCm", label: "Braço", color: "#10b981", unit: " cm" },
  { k: "thighCm", label: "Coxa", color: "#0ea5e9", unit: " cm" },
  { k: "sleepHours", label: "Sono", color: "#6366f1", unit: " h" },
  { k: "restingHr", label: "FC repouso", color: "#ef4444", unit: " bpm" },
];

export default function MetricsPanel({
  today,
  profile,
  targets,
  adherence,
  metrics,
}: {
  today: string;
  profile: Profile;
  targets: { kcal: number; protein: number; water: number };
  adherence: { daysLogged: number; kcal: number; protein: number; waterDays: number; water: number; workouts: number };
  metrics: M[];
}) {
  const [date, setDate] = useState(today);
  const existing = metrics.find((m) => m.date === date);
  const blank = (m?: M) => Object.fromEntries(FIELDS.map((f) => [f.k, m && m[f.k as keyof M] != null ? String(m[f.k as keyof M]) : ""])) as Record<string, string>;
  const [form, setForm] = useState<Record<string, string>>(blank(existing));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [chart, setChart] = useState<keyof M>("weightKg");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const changeDate = (d: string) => {
    setDate(d);
    const e = metrics.find((m) => m.date === d);
    setForm(blank(e));
    setNotes(e?.notes ?? "");
  };

  const latest = (k: keyof M) => {
    for (let i = metrics.length - 1; i >= 0; i--) if (metrics[i][k] != null) return metrics[i][k] as number;
    return null;
  };

  const weight = latest("weightKg") ?? profile.weightKg;
  const waist = latest("waistCm");
  const hip = latest("hipCm");
  const neck = latest("neckCm");
  const bfReg = latest("bodyFatPct");
  const bfNavy = navyBodyFat(profile.sex, profile.heightCm, waist, neck, hip);
  const bf = bfReg ?? bfNavy;
  const imc = bmi(weight, profile.heightCm);
  const rcq = waist && hip ? waist / hip : null;
  const rcqRisk = rcq ? (profile.sex === "M" ? rcq > 0.9 : rcq > 0.85) : null;
  const rca = waist ? waist / profile.heightCm : null;

  const weights = metrics.filter((m) => m.weightKg != null);
  const startW = weights[0]?.weightKg ?? profile.weightKg;
  const totalToGo = Math.abs(profile.targetWeightKg - startW);
  const progressed = Math.abs(startW - weight) * (Math.sign(profile.targetWeightKg - startW) === Math.sign(weight - startW) ? 1 : -1);
  const progressPct = totalToGo > 0 ? Math.max(0, Math.min(progressed / totalToGo, 1)) : 1;

  const rate = useMemo(() => {
    if (weights.length < 2) return null;
    const last = weights[weights.length - 1];
    const ref = [...weights].reverse().find((w) => (new Date(last.date).getTime() - new Date(w.date).getTime()) / 86400000 >= 6) ?? weights[0];
    const days = (new Date(last.date).getTime() - new Date(ref.date).getTime()) / 86400000;
    if (days < 3) return null;
    return (((last.weightKg as number) - (ref.weightKg as number)) / days) * 7;
  }, [weights]);

  const rateMsg = (() => {
    if (rate === null) return "Registre o peso por pelo menos 1 semana para ver sua tendência.";
    if (profile.goal === "perder") {
      if (rate > 0.1) return "Peso subindo — revise a adesão ao cardápio e o registro das refeições.";
      if (rate < -weight * 0.01) return "Perda acima de 1% do peso/semana — considere aumentar um pouco as calorias para preservar músculo.";
      return "Ritmo saudável de perda. Continue assim!";
    }
    if (profile.goal === "ganhar") {
      if (rate < 0.05) return "Peso estável — adicione ~150 kcal por dia (ex.: 1 colher de pasta de amendoim + 1 banana).";
      if (rate > 0.5) return "Ganho rápido — reduza ~150 kcal para minimizar gordura.";
      return "Ganho controlado, ideal para hipertrofia.";
    }
    return Math.abs(rate) < 0.25 ? "Peso estável — ótimo para manutenção/recomposição." : "Variação acima do esperado — confira medidas, não só a balança.";
  })();

  const save = () =>
    start(async () => {
      const payload: MetricInput = { date, notes };
      for (const f of FIELDS) (payload as Record<string, unknown>)[f.k] = form[f.k as string] === "" ? null : Number(form[f.k as string]);
      await saveMetric(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });

  const chartDef = CHARTS.find((c) => c.k === chart)!;
  const chartData = metrics.filter((m) => m[chart] != null).map((m) => ({ x: formatDateBR(m.date), y: m[chart] as number }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Peso" value={`${fmt(weight, 1)} kg`} sub={rate !== null ? `${rate > 0 ? "+" : ""}${fmt(rate, 2)} kg/semana` : "sem tendência ainda"} icon={rate !== null && rate > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />} tone="violet" />
        <Stat label="IMC" value={fmt(imc, 1)} sub={<span className={bmiClass(imc).color}>{bmiClass(imc).label}</span>} icon={<Scale size={16} />} tone="sky" />
        <Stat label="% Gordura" value={bf ? `${fmt(bf, 1)}%` : "—"} sub={bf ? (bfReg ? "registrado" : "estimado (Marinha EUA)") : "informe cintura + pescoço" + (profile.sex === "F" ? " + quadril" : "")} icon={<Percent size={16} />} tone="rose" />
        <Stat label="Massa magra" value={bf ? `${fmt(weight * (1 - bf / 100), 1)} kg` : "—"} sub={bf ? `gordura: ${fmt((weight * bf) / 100, 1)} kg` : "precisa do % gordura"} icon={<HeartPulse size={16} />} tone="emerald" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Formulário */}
        <div className="card p-5 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <Ruler size={18} className="text-emerald-600 dark:text-emerald-400" /> Registrar medidas
          </h2>
          <div className="mb-3">
            <label className="label">Data</label>
            <input type="date" className="input" value={date} max={today} onChange={(e) => changeDate(e.target.value)} />
            {existing && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Já existe registro nesta data — salvar irá atualizar.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <div key={f.k} className={f.k === "bodyFatPct" ? "col-span-2" : ""}>
                <label className="label !normal-case !tracking-normal">
                  {f.label} <span className="text-slate-400">({f.unit})</span>
                </label>
                <input type="number" inputMode="decimal" step={f.step} className="input" value={form[f.k as string]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <label className="label">Observações</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: medido em jejum" />
          </div>
          <button className="btn-primary mt-4 w-full" disabled={pending} onClick={save}>
            {saved ? <CheckCircle2 size={16} /> : <Save size={16} />} {pending ? "Salvando..." : saved ? "Salvo! Metas atualizadas" : "Salvar"}
          </button>
          <p className="mt-2 text-xs text-slate-500">Dica: meça sempre pela manhã, em jejum, após ir ao banheiro.</p>
        </div>

        <div className="space-y-4 lg:col-span-2">
          {/* Gráfico */}
          <div className="card p-5 sm:p-6">
            <div className="scrollbar-none -mx-1 mb-3 flex gap-2 overflow-x-auto px-1">
              {CHARTS.map((c) => (
                <button key={c.k} onClick={() => setChart(c.k)} className={`shrink-0 ${chart === c.k ? "chip-on" : "chip-off"}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <LineChart data={chartData} color={chartDef.color} unit={chartDef.unit} target={chart === "weightKg" ? profile.targetWeightKg : undefined} />
            <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{rateMsg}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Progresso */}
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-bold">
                <Target size={18} className="text-violet-500" /> Rumo à meta
              </h3>
              <div className="mb-2 flex justify-between text-sm">
                <span>{fmt(startW, 1)} kg</span>
                <span className="font-bold text-violet-600">{Math.round(progressPct * 100)}%</span>
                <span>{fmt(profile.targetWeightKg, 1)} kg</span>
              </div>
              <Bar value={progressPct} max={1} color="bg-violet-500" h="h-3" />
              <p className="mt-2 text-xs text-slate-500">Faltam {fmt(Math.abs(profile.targetWeightKg - weight), 1)} kg.</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Relação cintura/quadril</span>
                  <b className={rcqRisk ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>{rcq ? `${fmt(rcq, 2)} ${rcqRisk ? "· risco" : "· ok"}` : "—"}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Relação cintura/altura</span>
                  <b className={rca && rca >= 0.5 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>{rca ? `${fmt(rca, 2)} ${rca >= 0.5 ? "· acima de 0,5" : "· ok"}` : "—"}</b>
                </div>
              </div>
            </div>
            {/* Adesão */}
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-bold">
                <Moon size={18} className="text-indigo-500" /> Adesão (14 dias)
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="text-slate-500">Dias com refeições registradas</span>
                    <b>{adherence.daysLogged}/14</b>
                  </div>
                  <Bar value={adherence.daysLogged} max={14} />
                </div>
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="text-slate-500">Média calórica</span>
                    <b>
                      {fmt(adherence.kcal)} / {targets.kcal}
                    </b>
                  </div>
                  <Bar value={adherence.kcal} max={targets.kcal} color="bg-slate-700" />
                </div>
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="text-slate-500">Média de proteína</span>
                    <b>
                      {fmt(adherence.protein)} / {targets.protein} g
                    </b>
                  </div>
                  <Bar value={adherence.protein} max={targets.protein} color="bg-rose-500" />
                </div>
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="text-slate-500">Água média</span>
                    <b>
                      {fmt(adherence.water)} / {targets.water} ml
                    </b>
                  </div>
                  <Bar value={adherence.water} max={targets.water} color="bg-cyan-500" />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Treinos</span>
                  <b>
                    {adherence.workouts} / {profile.trainingDays * 2}
                  </b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico */}
      <div className="card p-5 sm:p-6">
        <h2 className="mb-3 font-bold">Histórico de medidas</h2>
        {metrics.length ? (
          <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2">Data</th>
                  <th>Peso</th>
                  <th>% Gord.</th>
                  <th>Cintura</th>
                  <th>Quadril</th>
                  <th>Braço</th>
                  <th>Coxa</th>
                  <th>Sono</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...metrics].reverse().map((m) => (
                  <tr key={m.id} className="tabular-nums">
                    <td className="py-2.5 font-medium">{formatDateBR(m.date, { day: "2-digit", month: "short", year: "2-digit" })}</td>
                    <td>{m.weightKg ?? "—"}</td>
                    <td>{m.bodyFatPct ?? "—"}</td>
                    <td>{m.waistCm ?? "—"}</td>
                    <td>{m.hipCm ?? "—"}</td>
                    <td>{m.armCm ?? "—"}</td>
                    <td>{m.thighCm ?? "—"}</td>
                    <td>{m.sleepHours ?? "—"}</td>
                    <td className="text-right">
                      <button className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400" onClick={() => start(() => deleteMetric(m.id))} aria-label="Remover">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={<Ruler size={20} />} title="Nenhuma medida ainda" text="Comece registrando seu peso de hoje." />
        )}
      </div>
    </div>
  );
}
