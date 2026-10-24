"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, X, Minus, Plus, ArrowLeft, AlertTriangle, Check, ChefHat, PenLine } from "lucide-react";
import { FOODS, FOOD_CATEGORIES, Food, foodAllowed, macrosFor, searchFoods } from "@/lib/foods";
import { RECIPES, recipeNutrition, recipeCompatibility } from "@/lib/recipes";
import { MEALS, type Profile, type Targets } from "@/lib/calc";
import { addFoodEntries } from "@/app/actions";
import { MacroPills, fmt } from "@/components/ui";

type Totals = { kcal: number; protein: number; carbs: number; fat: number };

function NutritionLabel({ m, grams }: { m: ReturnType<typeof macrosFor>; grams: number }) {
  const rows: [string, string, boolean?][] = [
    ["Valor energético", `${m.kcal} kcal`, true],
    ["Proteínas", `${fmt(m.protein, 1)} g`],
    ["Carboidratos", `${fmt(m.carbs, 1)} g`],
    ["  Fibra alimentar", `${fmt(m.fiber, 1)} g`],
    ["  Carboidrato líquido", `${fmt(Math.max(m.carbs - m.fiber, 0), 1)} g`],
    ["Gorduras totais", `${fmt(m.fat, 1)} g`],
  ];
  return (
    <div className="rounded-2xl border-2 border-slate-900 p-3 font-mono text-[13px]">
      <div className="border-b-4 border-slate-900 pb-1 text-base font-black tracking-tight">INFORMAÇÃO NUTRICIONAL</div>
      <div className="border-b border-slate-900 py-1 text-xs">Porção de {fmt(grams)} g</div>
      {rows.map(([l, v, b]) => (
        <div key={l} className={`flex justify-between border-b border-slate-300 py-1 ${b ? "font-bold" : ""}`}>
          <span className="whitespace-pre">{l}</span>
          <span>{v}</span>
        </div>
      ))}
    </div>
  );
}

function blockedReason(f: Food, p: Profile) {
  const filter = { diet: p.diet, restrictions: p.restrictions, dislikes: p.dislikes };
  if (foodAllowed(f, filter)) {
    if (p.healthConditions.includes("diabetes") && f.gi === "alto") return "Índice glicêmico alto";
    if (p.healthConditions.includes("hipertensao") && f.sodium === "alto") return "Rico em sódio";
    return null;
  }
  return "Fora do seu perfil alimentar";
}

export default function AddFoodModal({
  open,
  onClose,
  date,
  meal: initialMeal,
  meals,
  profile,
  targets,
  totals,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  meal: string;
  meals: string[];
  profile: Profile;
  targets: Targets;
  totals: Totals;
}) {
  const [tab, setTab] = useState<"foods" | "recipes" | "custom">("foods");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [sel, setSel] = useState<Food | null>(null);
  const [portionIdx, setPortionIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [meal, setMeal] = useState(initialMeal);
  const [pending, start] = useTransition();
  const [okMsg, setOkMsg] = useState("");
  const [custom, setCustom] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });

  const list = useMemo(() => {
    const base = cat ? FOODS.filter((f) => f.cat === cat) : FOODS;
    const r = searchFoods(q, base);
    return r.sort((a, b) => Number(!!blockedReason(a, profile)) - Number(!!blockedReason(b, profile)));
  }, [q, cat, profile]);

  if (!open) return null;

  const portion = sel ? sel.portions[portionIdx] : null;
  const grams = portion ? Math.round(portion.g * qty) : 0;
  const m = sel ? macrosFor(sel, grams) : null;

  const after = m ? { kcal: totals.kcal + m.kcal, protein: totals.protein + m.protein, carbs: totals.carbs + m.carbs, fat: totals.fat + m.fat } : totals;

  const flash = (msg: string) => {
    setOkMsg(msg);
    setTimeout(() => setOkMsg(""), 1800);
  };

  const addSelected = () => {
    if (!sel || !portion) return;
    start(async () => {
      await addFoodEntries([{ date, meal, foodKey: sel.key, grams, portionLabel: portion.l === "100 g" ? `${grams} g` : `${String(qty).replace(".", ",")}× ${portion.l}` }]);
      flash(`${sel.name} adicionado!`);
      setSel(null);
    });
  };

  const choose = (f: Food) => {
    setSel(f);
    setPortionIdx(0);
    setQty(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-fade-up sm:rounded-3xl">
        <div className="flex items-center gap-2 border-b border-slate-100 p-4">
          {sel ? (
            <button onClick={() => setSel(null)} className="btn-ghost !p-2" aria-label="Voltar">
              <ArrowLeft size={18} />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-500">Adicionar em</div>
            <select value={meal} onChange={(e) => setMeal(e.target.value)} className="-ml-1 bg-transparent font-bold outline-none">
              {[...new Set([...meals, ...Object.keys(MEALS)])].map((k) => (
                <option key={k} value={k}>
                  {MEALS[k].emoji} {MEALS[k].label}
                </option>
              ))}
            </select>
          </div>
          <button onClick={onClose} className="btn-ghost !p-2" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        {okMsg && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            <Check size={16} /> {okMsg}
          </div>
        )}

        {!sel && (
          <div className="flex gap-1 px-4 pt-3">
            {[
              ["foods", "Alimentos", Search],
              ["recipes", "Receitas", ChefHat],
              ["custom", "Manual", PenLine],
            ].map(([k, l, Icon]) => {
              const I = Icon as typeof Search;
              return (
                <button key={k as string} onClick={() => setTab(k as typeof tab)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold ${tab === k ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                  <I size={15} /> {l as string}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {sel && m && portion ? (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {sel.cat} · fonte {sel.src}
                </div>
                <h3 className="text-xl font-bold">{sel.name}</h3>
                {blockedReason(sel, profile) && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <AlertTriangle size={16} /> {blockedReason(sel, profile)} — atenção ao consumir.
                  </div>
                )}
              </div>

              <div>
                <label className="label">Medida</label>
                <div className="flex flex-wrap gap-2">
                  {sel.portions.map((pp, i) => (
                    <button key={pp.l} onClick={() => { setPortionIdx(i); setQty(pp.l === "100 g" ? 1 : 1); }} className={portionIdx === i ? "chip-on" : "chip-off"}>
                      {pp.l} {pp.l !== "100 g" && <span className="text-xs opacity-60">({pp.g} g)</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="btn-ghost !p-3" onClick={() => setQty((v) => Math.max(0.5, +(v - 0.5).toFixed(1)))} aria-label="Menos">
                  <Minus size={18} />
                </button>
                <div className="flex-1 text-center">
                  <input type="number" step="0.5" min="0.25" value={qty} onChange={(e) => setQty(Math.max(0.1, Number(e.target.value) || 0.1))} className="input text-center text-xl font-bold" />
                  <div className="mt-1 text-xs text-slate-500">= {grams} g</div>
                </div>
                <button className="btn-ghost !p-3" onClick={() => setQty((v) => +(v + 0.5).toFixed(1))} aria-label="Mais">
                  <Plus size={18} />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <NutritionLabel m={m} grams={grams} />
                <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-700">Impacto no seu dia</div>
                  {(
                    [
                      ["Calorias", totals.kcal, after.kcal, targets.kcal, "kcal", "bg-slate-800"],
                      ["Proteína", totals.protein, after.protein, targets.protein, "g", "bg-rose-500"],
                      ["Carboidrato", totals.carbs, after.carbs, targets.carbs, "g", "bg-amber-400"],
                      ["Gordura", totals.fat, after.fat, targets.fat, "g", "bg-sky-500"],
                    ] as const
                  ).map(([l, before, aft, tgt, u, c]) => (
                    <div key={l}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-slate-600">{l}</span>
                        <span className={`tabular-nums ${aft > tgt * 1.05 ? "font-bold text-rose-600" : "text-slate-500"}`}>
                          {fmt(aft)} / {tgt} {u}
                        </span>
                      </div>
                      <div className="relative h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className={`absolute h-2 ${c} opacity-40`} style={{ width: `${Math.min((aft / tgt) * 100, 100)}%` }} />
                        <div className={`absolute h-2 ${c}`} style={{ width: `${Math.min((before / tgt) * 100, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-slate-500">Restam {fmt(Math.max(targets.kcal - after.kcal, 0))} kcal após adicionar.</p>
                </div>
              </div>
            </div>
          ) : tab === "foods" ? (
            <div className="space-y-3">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className="input !pl-10" placeholder="Buscar: frango, arroz, iogurte..." />
              </div>
              <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
                <button onClick={() => setCat("")} className={`shrink-0 ${!cat ? "chip-on" : "chip-off"}`}>
                  Todos
                </button>
                {FOOD_CATEGORIES.map((c) => (
                  <button key={c} onClick={() => setCat(c)} className={`shrink-0 ${cat === c ? "chip-on" : "chip-off"}`}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="divide-y divide-slate-100">
                {list.map((f) => {
                  const br = blockedReason(f, profile);
                  return (
                    <button key={f.key} onClick={() => choose(f)} className={`flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50 ${br ? "opacity-55" : ""}`}>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{f.name}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <MacroPills small kcal={f.kcal} p={f.p} c={f.c} f={f.f} />
                          <span className="text-[11px] text-slate-400">/100 g</span>
                        </div>
                        {br && <div className="mt-1 text-[11px] font-medium text-amber-600">⚠ {br}</div>}
                      </div>
                      <Plus size={18} className="text-emerald-600" />
                    </button>
                  );
                })}
                {!list.length && <div className="py-8 text-center text-sm text-slate-500">Nenhum alimento encontrado. Use a aba “Manual”.</div>}
              </div>
            </div>
          ) : tab === "recipes" ? (
            <div className="grid gap-2">
              {RECIPES.map((r) => {
                const n = recipeNutrition(r);
                const comp = recipeCompatibility(r, profile.diet, profile.restrictions, profile.dislikes);
                return (
                  <div key={r.key} className={`flex items-center gap-3 rounded-2xl border border-slate-200 p-3 ${comp.ok ? "" : "opacity-55"}`}>
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${r.gradient} text-2xl`}>{r.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{r.name}</div>
                      <MacroPills small kcal={n.kcal} p={n.protein} c={n.carbs} f={n.fat} />
                      {!comp.ok && <div className="mt-0.5 text-[11px] text-amber-600">⚠ {comp.reasons[0]}</div>}
                    </div>
                    <button
                      className="btn-primary !px-3"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          await addFoodEntries([{ date, meal, recipeKey: r.key, servings: 1 }]);
                          flash(`${r.name} adicionada!`);
                        })
                      }
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Copie os valores do rótulo do produto (por porção consumida).</p>
              <div>
                <label className="label">Nome</label>
                <input className="input" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder="Ex.: Barra de cereal X" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(["kcal", "protein", "carbs", "fat"] as const).map((k) => (
                  <div key={k}>
                    <label className="label">{{ kcal: "Kcal", protein: "Proteína g", carbs: "Carbo g", fat: "Gordura g" }[k]}</label>
                    <input type="number" inputMode="decimal" className="input" value={custom[k]} onChange={(e) => setCustom({ ...custom, [k]: e.target.value })} />
                  </div>
                ))}
              </div>
              <button
                className="btn-primary w-full"
                disabled={!custom.name || !custom.kcal || pending}
                onClick={() =>
                  start(async () => {
                    await addFoodEntries([{ date, meal, custom: { name: custom.name, kcal: +custom.kcal, protein: +custom.protein || 0, carbs: +custom.carbs || 0, fat: +custom.fat || 0 } }]);
                    flash(`${custom.name} adicionado!`);
                    setCustom({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
                  })
                }
              >
                <Plus size={16} /> Adicionar
              </button>
            </div>
          )}
        </div>

        {sel && m && (
          <div className="border-t border-slate-100 p-4">
            <button className="btn-primary w-full !py-3 text-base" onClick={addSelected} disabled={pending}>
              {pending ? "Adicionando..." : `Adicionar ${grams} g · ${m.kcal} kcal`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
