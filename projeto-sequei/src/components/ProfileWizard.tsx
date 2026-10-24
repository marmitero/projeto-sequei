"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Leaf, ShieldAlert, Sparkles } from "lucide-react";
import { saveProfile } from "@/app/actions";
import { ACTIVITY_FACTORS, GOALS, ageFrom, bmi, bmiClass, computeTargets, weeksToGoal, type Profile } from "@/lib/calc";
import { CARDIO, EQUIPMENT_LABELS, INJURY_LABELS } from "@/lib/exercises";

const DEFAULT: Profile = {
  name: "",
  sex: "F",
  birthDate: "1995-01-01",
  heightCm: 165,
  weightKg: 70,
  targetWeightKg: 65,
  goal: "perder",
  pace: "moderado",
  activityLevel: "leve",
  experience: "iniciante",
  trainingDays: 3,
  sessionMinutes: 60,
  location: "academia",
  equipment: [],
  cardioPrefs: ["caminhada"],
  injuries: [],
  diet: "onivoro",
  carbApproach: "equilibrado",
  restrictions: [],
  dislikes: "",
  healthConditions: [],
  mealsPerDay: 5,
  wakeTime: "07:00",
  sleepTime: "23:00",
  trainingTime: "noite",
  climate: "temperado",
  timezone: "America/Sao_Paulo",
};

const STEPS = ["Sobre você", "Objetivo", "Rotina", "Treino", "Alimentação", "Saúde e resumo"];

const RESTRICTIONS: Record<string, string> = {
  lactose: "Lactose",
  gluten: "Glúten",
  oleaginosas: "Oleaginosas",
  amendoim: "Amendoim",
  ovo: "Ovo",
  frutos_do_mar: "Frutos do mar / peixe",
  soja: "Soja",
};

const CONDITIONS: Record<string, string> = {
  diabetes: "Diabetes / pré-diabetes",
  hipertensao: "Hipertensão",
  colesterol: "Colesterol alto",
  hipotireoidismo: "Hipotireoidismo",
  renal: "Doença renal",
  gestante: "Gestante",
  lactante: "Amamentando",
};

function Option({ on, onClick, title, desc, emoji }: { on: boolean; onClick: () => void; title: string; desc?: string; emoji?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition ${on ? "border-emerald-500 bg-emerald-50/60 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
    >
      {emoji && <span className="text-2xl leading-none">{emoji}</span>}
      <span className="min-w-0">
        <span className="block font-semibold text-slate-900">{title}</span>
        {desc && <span className="mt-0.5 block text-xs text-slate-500">{desc}</span>}
      </span>
      {on && (
        <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white">
          <Check size={12} />
        </span>
      )}
    </button>
  );
}

function Chips({ options, value, onChange }: { options: Record<string, string>; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(options).map(([k, l]) => {
        const on = value.includes(k);
        return (
          <button type="button" key={k} className={on ? "chip-on" : "chip-off"} onClick={() => onChange(on ? value.filter((x) => x !== k) : [...value, k])}>
            {on && <Check size={14} />} {l}
          </button>
        );
      })}
    </div>
  );
}

export default function ProfileWizard({ initial, mode }: { initial?: Profile; mode: "create" | "edit" }) {
  const [p, setP] = useState<Profile>(initial ?? DEFAULT);
  const [step, setStep] = useState(0);
  const [agree, setAgree] = useState(mode === "edit");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((s) => ({ ...s, [k]: v }));

  const targets = useMemo(() => computeTargets(p), [p]);
  const age = ageFrom(p.birthDate);
  const imc = bmi(p.weightKg, p.heightCm);
  const weeks = weeksToGoal(p, targets);

  const valid = [
    p.name.trim().length >= 2 && age >= 14 && age <= 100 && p.heightCm >= 120 && p.weightKg >= 30,
    p.targetWeightKg >= 30,
    true,
    p.trainingDays >= 1,
    true,
    agree,
  ];

  const submit = () => {
    setError("");
    start(async () => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
        await saveProfile({ ...p, timezone: tz });
        router.push("/");
        router.refresh();
      } catch {
        setError("Não foi possível salvar. Tente novamente.");
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      {mode === "create" && (
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
            <Leaf size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Vamos montar seu plano</h1>
            <p className="text-sm text-slate-500">Leva 2 minutos. Tudo no FitVida é calculado a partir das suas respostas.</p>
          </div>
        </div>
      )}

      {/* Progresso */}
      <div className="mb-5 flex gap-1.5">
        {STEPS.map((s, i) => (
          <button key={s} type="button" onClick={() => i < step && setStep(i)} className="flex-1">
            <div className={`h-1.5 rounded-full transition ${i <= step ? "bg-emerald-500" : "bg-slate-200"}`} />
            <div className={`mt-1.5 hidden text-left text-[11px] font-medium sm:block ${i === step ? "text-emerald-700" : "text-slate-400"}`}>{s}</div>
          </button>
        ))}
      </div>

      <div className="card p-5 sm:p-7">
        <h2 className="mb-1 text-lg font-bold">{STEPS[step]}</h2>
        <p className="mb-5 text-sm text-slate-500">
          {[
            "Usamos esses dados na equação de Mifflin-St Jeor para estimar seu metabolismo.",
            "Define o ajuste calórico e a distribuição de macronutrientes.",
            "Seu nível de atividade e horários personalizam calorias e lembretes de água.",
            "Montamos o treino com o que você tem disponível e respeitando lesões.",
            "Cardápios e receitas só mostrarão alimentos compatíveis com você.",
            "Condições de saúde ajustam metas e filtram alimentos e exercícios.",
          ][step]}
        </p>

        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Como podemos te chamar?</label>
              <input className="input" value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Sexo biológico</label>
              <div className="grid grid-cols-2 gap-3">
                <Option on={p.sex === "F"} onClick={() => set("sex", "F")} title="Feminino" emoji="♀️" />
                <Option on={p.sex === "M"} onClick={() => set("sex", "M")} title="Masculino" emoji="♂️" />
              </div>
            </div>
            <div>
              <label className="label">Data de nascimento</label>
              <input type="date" className="input" value={p.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
              <p className="mt-1 text-xs text-slate-400">{age} anos</p>
            </div>
            <div>
              <label className="label">Altura (cm)</label>
              <input type="number" inputMode="decimal" className="input" value={p.heightCm} onChange={(e) => set("heightCm", Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Peso atual (kg)</label>
              <input type="number" step="0.1" inputMode="decimal" className="input" value={p.weightKg} onChange={(e) => set("weightKg", Number(e.target.value))} />
            </div>
            <div className="flex items-end">
              <div className="w-full rounded-2xl bg-slate-50 p-3 text-sm">
                IMC: <b>{imc.toFixed(1)}</b> <span className={bmiClass(imc).color}>· {bmiClass(imc).label}</span>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(GOALS).map(([k, g]) => (
                <Option key={k} on={p.goal === k} onClick={() => set("goal", k)} title={g.label} desc={g.desc} emoji={{ perder: "🔥", manter: "⚖️", ganhar: "💪", recomp: "🔁" }[k]} />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Peso desejado (kg)</label>
                <input type="number" step="0.1" className="input" value={p.targetWeightKg} onChange={(e) => set("targetWeightKg", Number(e.target.value))} />
              </div>
              {(p.goal === "perder" || p.goal === "ganhar") && (
                <div>
                  <label className="label">Ritmo</label>
                  <select className="input" value={p.pace} onChange={(e) => set("pace", e.target.value)}>
                    <option value="leve">Leve — mais sustentável</option>
                    <option value="moderado">Moderado — recomendado</option>
                    <option value="agressivo">Acelerado — exige disciplina</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="grid gap-3">
              {Object.entries(ACTIVITY_FACTORS).map(([k, a]) => (
                <Option key={k} on={p.activityLevel === k} onClick={() => set("activityLevel", k)} title={a.label} desc={a.desc} />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label">Acorda às</label>
                <input type="time" className="input" value={p.wakeTime} onChange={(e) => set("wakeTime", e.target.value)} />
              </div>
              <div>
                <label className="label">Dorme às</label>
                <input type="time" className="input" value={p.sleepTime} onChange={(e) => set("sleepTime", e.target.value)} />
              </div>
              <div>
                <label className="label">Treina de</label>
                <select className="input" value={p.trainingTime} onChange={(e) => set("trainingTime", e.target.value)}>
                  <option value="manha">Manhã</option>
                  <option value="tarde">Tarde</option>
                  <option value="noite">Noite</option>
                </select>
              </div>
              <div>
                <label className="label">Clima onde vive</label>
                <select className="input" value={p.climate} onChange={(e) => set("climate", e.target.value)}>
                  <option value="quente">Quente</option>
                  <option value="temperado">Ameno</option>
                  <option value="frio">Frio</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="label">Experiência com treino</label>
              <div className="grid gap-3 sm:grid-cols-3">
                <Option on={p.experience === "iniciante"} onClick={() => set("experience", "iniciante")} title="Iniciante" desc="Menos de 6 meses" />
                <Option on={p.experience === "intermediario"} onClick={() => set("experience", "intermediario")} title="Intermediário" desc="6 meses a 2 anos" />
                <Option on={p.experience === "avancado"} onClick={() => set("experience", "avancado")} title="Avançado" desc="Mais de 2 anos" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Dias por semana: {p.trainingDays}</label>
                <input type="range" min={1} max={7} value={p.trainingDays} onChange={(e) => set("trainingDays", Number(e.target.value))} className="w-full accent-emerald-600" />
              </div>
              <div>
                <label className="label">Minutos por treino: {p.sessionMinutes}</label>
                <input type="range" min={20} max={120} step={5} value={p.sessionMinutes} onChange={(e) => set("sessionMinutes", Number(e.target.value))} className="w-full accent-emerald-600" />
              </div>
            </div>
            <div>
              <label className="label">Onde você treina?</label>
              <div className="grid gap-3 sm:grid-cols-3">
                <Option on={p.location === "academia"} onClick={() => set("location", "academia")} title="Academia" emoji="🏋️" />
                <Option on={p.location === "casa"} onClick={() => set("location", "casa")} title="Em casa" emoji="🏠" />
                <Option on={p.location === "ar_livre"} onClick={() => set("location", "ar_livre")} title="Ao ar livre" emoji="🌳" />
              </div>
            </div>
            {p.location !== "academia" && (
              <div>
                <label className="label">Equipamentos disponíveis</label>
                <Chips options={EQUIPMENT_LABELS} value={p.equipment} onChange={(v) => set("equipment", v)} />
              </div>
            )}
            <div>
              <label className="label">Cardio que você curte</label>
              <Chips options={Object.fromEntries(Object.entries(CARDIO).map(([k, c]) => [k, c.label]))} value={p.cardioPrefs} onChange={(v) => set("cardioPrefs", v)} />
            </div>
            <div>
              <label className="label">Lesões ou dores</label>
              <Chips options={INJURY_LABELS} value={p.injuries} onChange={(v) => set("injuries", v)} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div>
              <label className="label">Padrão alimentar</label>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ["onivoro", "Onívoro", "🍗"],
                  ["pescetariano", "Pescetariano", "🐟"],
                  ["vegetariano", "Vegetariano", "🥚"],
                  ["vegano", "Vegano", "🌱"],
                ].map(([k, l, e]) => (
                  <Option key={k} on={p.diet === k} onClick={() => set("diet", k)} title={l} emoji={e} />
                ))}
              </div>
            </div>
            <div>
              <label className="label">Estratégia de carboidratos</label>
              <div className="grid gap-3 sm:grid-cols-3">
                <Option on={p.carbApproach === "equilibrado"} onClick={() => set("carbApproach", "equilibrado")} title="Equilibrada" desc="45–55% carboidratos" />
                <Option on={p.carbApproach === "lowcarb"} onClick={() => set("carbApproach", "lowcarb")} title="Low-carb" desc="Até ~20% / 130 g" />
                <Option on={p.carbApproach === "cetogenica"} onClick={() => set("carbApproach", "cetogenica")} title="Cetogênica" desc="~30 g de carbo/dia" />
              </div>
            </div>
            <div>
              <label className="label">Refeições por dia: {p.mealsPerDay}</label>
              <input type="range" min={3} max={6} value={p.mealsPerDay} onChange={(e) => set("mealsPerDay", Number(e.target.value))} className="w-full accent-emerald-600" />
            </div>
            <div>
              <label className="label">Alergias e intolerâncias</label>
              <Chips options={RESTRICTIONS} value={p.restrictions} onChange={(v) => set("restrictions", v)} />
            </div>
            <div>
              <label className="label">Alimentos que você não gosta</label>
              <input className="input" value={p.dislikes} onChange={(e) => set("dislikes", e.target.value)} placeholder="Ex.: brócolis, fígado, beterraba" />
              <p className="mt-1 text-xs text-slate-400">Separe por vírgulas. Eles nunca aparecerão nas sugestões.</p>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <div>
              <label className="label">Condições de saúde</label>
              <Chips options={p.sex === "F" ? CONDITIONS : Object.fromEntries(Object.entries(CONDITIONS).filter(([k]) => k !== "gestante" && k !== "lactante"))} value={p.healthConditions} onChange={(v) => set("healthConditions", v)} />
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-emerald-900 p-5 text-white">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <Sparkles size={16} /> Seu plano personalizado
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Meta diária", `${targets.kcal} kcal`],
                  ["Proteína", `${targets.protein} g`],
                  ["Carboidrato", `${targets.carbs} g`],
                  ["Gordura", `${targets.fat} g`],
                  ["Água", `${(targets.water / 1000).toFixed(2).replace(".", ",")} L`],
                  ["TMB", `${targets.bmr} kcal`],
                  ["Gasto total", `${targets.tdee} kcal`],
                  ["Previsão", weeks ? `~${weeks} semanas` : "Manutenção"],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-2xl bg-white/10 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-emerald-200/80">{l}</div>
                    <div className="mt-0.5 text-lg font-bold">{v}</div>
                  </div>
                ))}
              </div>
              {targets.notes.length > 0 && (
                <ul className="mt-4 space-y-1 text-xs text-emerald-100/90">
                  {targets.notes.map((n) => (
                    <li key={n}>• {n}</li>
                  ))}
                </ul>
              )}
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-600" />
              <span>
                <ShieldAlert size={16} className="mr-1 inline" />
                Entendo que o FitVida oferece estimativas educativas e não substitui o acompanhamento de médico, nutricionista ou educador físico.
              </span>
            </label>
            {error && <p className="text-sm text-rose-600">{error}</p>}
          </div>
        )}

        <div className="mt-7 flex items-center justify-between gap-3">
          <button type="button" className="btn-ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft size={16} /> Voltar
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn-primary" disabled={!valid[step]} onClick={() => setStep((s) => s + 1)}>
              Continuar <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" className="btn-primary" disabled={!agree || pending} onClick={submit}>
              {pending ? "Salvando..." : mode === "create" ? "Criar meu plano" : "Salvar alterações"} <Check size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
