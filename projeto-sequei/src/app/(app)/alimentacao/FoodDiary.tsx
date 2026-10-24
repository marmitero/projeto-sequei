"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Trash2, Shuffle, CheckCheck, Sparkles, Target, Zap, Copy } from "lucide-react";
import { addDays, formatDateBR, mealsFor, MEALS, type Profile, type Targets } from "@/lib/calc";
import { generateMealPlan } from "@/lib/mealplan";
import { FOODS, foodAllowed, macrosFor, bestPortion } from "@/lib/foods";
import { addFoodEntries, deleteFoodEntry, copyMeal } from "@/app/actions";
import { Ring, MacroRow, MacroPills, fmt, Bar } from "@/components/ui";
import AddFoodModal from "./AddFoodModal";

type Entry = { id: number; meal: string; name: string; grams: number; portionLabel: string; kcal: number; protein: number; carbs: number; fat: number; fiber: number };

export default function FoodDiary({ date, today, profile, targets, entries, seed }: { date: string; today: string; profile: Profile; targets: Targets; entries: Entry[]; seed: string }) {
  const router = useRouter();
  const [modal, setModal] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [pending, start] = useTransition();
  const [busyMeal, setBusyMeal] = useState<string | null>(null);

  const meals = mealsFor(profile.mealsPerDay);
  const allMeals = [...new Set([...meals, ...entries.map((e) => e.meal)])].sort((a, b) => Object.keys(MEALS).indexOf(a) - Object.keys(MEALS).indexOf(b));
  const totals = entries.reduce((a, e) => ({ kcal: a.kcal + e.kcal, protein: a.protein + e.protein, carbs: a.carbs + e.carbs, fat: a.fat + e.fat, fiber: a.fiber + e.fiber }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  const plan = useMemo(() => generateMealPlan(profile, targets, `${seed}|${date}`, overrides), [profile, targets, seed, date, overrides]);

  // Sugestões objetivas para fechar o dia
  const closers = useMemo(() => {
    const rem = { protein: targets.protein - totals.protein, carbs: targets.carbs - totals.carbs, fat: targets.fat - totals.fat, kcal: targets.kcal - totals.kcal };
    if (rem.kcal < 80) return { rem, focus: null as null | "protein" | "carbs" | "fat", items: [] as { key: string; name: string; grams: number; portion: string; m: ReturnType<typeof macrosFor> }[] };
    const ratios = { protein: rem.protein / targets.protein, carbs: rem.carbs / targets.carbs, fat: rem.fat / targets.fat };
    const focus = (Object.entries(ratios).sort((a, b) => b[1] - a[1])[0][0] as "protein" | "carbs" | "fat");
    const key = { protein: "p", carbs: "c", fat: "f" }[focus] as "p" | "c" | "f";
    const filter = { diet: profile.diet, restrictions: profile.restrictions, dislikes: profile.dislikes };
    const items = FOODS.filter((f) => foodAllowed(f, filter) && f.kcal > 20 && f.role !== "other" && f.role !== "drink")
      .filter((f) => !(profile.healthConditions.includes("diabetes") && f.gi === "alto"))
      .map((f) => ({ f, density: (f[key] * (key === "f" ? 9 : 4)) / f.kcal }))
      .sort((a, b) => b.density - a.density)
      .slice(0, 6)
      .map(({ f }) => {
        let g = (Math.max(rem[focus], 5) / Math.max(f[key], 0.1)) * 100;
        g = Math.min(g, (rem.kcal / f.kcal) * 100, f.role === "fat" ? 40 : 250);
        g = Math.max(Math.round(g / 5) * 5, 10);
        return { key: f.key, name: f.name, grams: g, portion: bestPortion(f, g), m: macrosFor(f, g) };
      });
    return { rem, focus, items };
  }, [targets, totals, profile]);

  const go = (d: string) => router.push(d === today ? "/alimentacao" : `/alimentacao?d=${d}`);

  return (
    <div className="space-y-6">
      {/* Navegação de data */}
      <div className="card flex items-center justify-between p-2">
        <button className="btn-ghost !p-2.5" onClick={() => go(addDays(date, -1))} aria-label="Dia anterior">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="font-bold capitalize">{date === today ? "Hoje" : formatDateBR(date, { weekday: "long" })}</div>
          <div className="text-xs text-slate-500">{formatDateBR(date, { day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
        <button className="btn-ghost !p-2.5" onClick={() => go(addDays(date, 1))} disabled={date >= today} aria-label="Próximo dia">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="card flex flex-col items-center justify-center p-5 md:col-span-2">
          <Ring value={totals.kcal} max={targets.kcal} size={170} stroke={16}>
            <div>
              <div className="text-3xl font-bold tabular-nums">{fmt(totals.kcal)}</div>
              <div className="text-xs text-slate-500">de {fmt(targets.kcal)} kcal</div>
            </div>
          </Ring>
          <div className="mt-3 text-sm text-slate-600">
            {targets.kcal - totals.kcal >= 0 ? (
              <>
                Restam <b className="text-emerald-600">{fmt(targets.kcal - totals.kcal)} kcal</b>
              </>
            ) : (
              <>
                <b className="text-rose-600">{fmt(totals.kcal - targets.kcal)} kcal</b> acima da meta
              </>
            )}
          </div>
        </div>
        <div className="card space-y-4 p-5 md:col-span-3">
          <MacroRow k="protein" value={totals.protein} target={targets.protein} />
          <MacroRow k="carbs" value={totals.carbs} target={targets.carbs} />
          <MacroRow k="fat" value={totals.fat} target={targets.fat} />
          <MacroRow k="fiber" value={totals.fiber} target={targets.fiber} />
          <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
            {(
              [
                ["Proteína", totals.protein * 4, "text-rose-600"],
                ["Carbo", totals.carbs * 4, "text-amber-600"],
                ["Gordura", totals.fat * 9, "text-sky-600"],
              ] as const
            ).map(([l, kc, c]) => (
              <div key={l} className="rounded-xl bg-slate-50 py-2">
                <div className={`text-base font-bold ${c}`}>{totals.kcal ? Math.round((kc / Math.max(totals.kcal, 1)) * 100) : 0}%</div>
                <div className="text-slate-500">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feche seu dia */}
      {closers.focus && closers.items.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-white">
            <Zap size={18} />
            <div className="font-semibold">
              Feche seu dia: faltam {fmt(Math.max(closers.rem[closers.focus], 0))} g de {{ protein: "proteína", carbs: "carboidrato", fat: "gordura" }[closers.focus]}
            </div>
          </div>
          <div className="scrollbar-none flex gap-3 overflow-x-auto p-4">
            {closers.items.map((it) => (
              <div key={it.key} className="w-56 shrink-0 rounded-2xl border border-slate-200 p-3">
                <div className="truncate text-sm font-semibold">{it.name}</div>
                <div className="text-xs text-slate-500">
                  {it.grams} g {it.portion && `· ${it.portion}`}
                </div>
                <div className="my-2">
                  <MacroPills small kcal={it.m.kcal} p={it.m.protein} c={it.m.carbs} f={it.m.fat} />
                </div>
                <button
                  className="btn-outline w-full !py-1.5 text-xs"
                  disabled={pending}
                  onClick={() => start(() => addFoodEntries([{ date, meal: meals[meals.length - 1], foodKey: it.key, grams: it.grams, portionLabel: it.portion || `${it.grams} g` }]))}
                >
                  <Plus size={14} /> Adicionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diário */}
      <div className="grid gap-4 lg:grid-cols-2">
        {allMeals.map((mk) => {
          const list = entries.filter((e) => e.meal === mk);
          const t = list.reduce((a, e) => a + e.kcal, 0);
          const planMeal = plan.find((p) => p.meal === mk);
          return (
            <div key={mk} className="card p-4 sm:p-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{MEALS[mk]?.emoji}</span>
                  <div>
                    <div className="font-bold">{MEALS[mk]?.label}</div>
                    <div className="text-xs text-slate-500">
                      {fmt(t)} kcal {planMeal && `· meta ~${planMeal.target.kcal}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="btn-ghost !px-2.5 !py-2 text-slate-500"
                    title="Repetir esta refeição de ontem"
                    aria-label="Repetir de ontem"
                    disabled={pending}
                    onClick={() => start(async () => { await copyMeal(addDays(date, -1), date, mk); })}
                  >
                    <Copy size={16} />
                  </button>
                  <button className="btn-primary !px-3 !py-2" onClick={() => setModal(mk)}>
                    <Plus size={16} /> <span className="hidden sm:inline">Adicionar</span>
                  </button>
                </div>
              </div>
              {planMeal && <Bar value={t} max={planMeal.target.kcal} h="h-1.5" />}
              <div className="mt-2 divide-y divide-slate-100">
                {list.map((e) => (
                  <div key={e.id} className="group flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{e.name}</div>
                      <div className="text-xs text-slate-500">{e.portionLabel || `${fmt(e.grams)} g`}</div>
                    </div>
                    <MacroPills small kcal={e.kcal} p={e.protein} c={e.carbs} f={e.fat} />
                    <button className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => start(() => deleteFoodEntry(e.id))} aria-label="Remover">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                {!list.length && <div className="py-3 text-sm text-slate-400">Nada registrado ainda.</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cardápio sugerido */}
      <section id="plano" className="scroll-mt-20">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Sparkles size={20} className="text-emerald-600" /> Cardápio sugerido para você
            </h2>
            <p className="text-sm text-slate-500">
              {profile.mealsPerDay} refeições · {targets.kcal} kcal · dieta {profile.diet}
              {profile.carbApproach !== "equilibrado" && ` · ${profile.carbApproach}`}
              {profile.restrictions.length > 0 && ` · sem ${profile.restrictions.join(", ").replace(/_/g, " ")}`}
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Target size={14} /> Porções calculadas pela tabela TACO
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plan.map((pm) => (
            <div key={pm.meal} className="card flex flex-col p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold">
                    {pm.emoji} {pm.label}
                  </div>
                  <div className="mt-1">
                    <MacroPills small kcal={pm.totals.kcal} p={pm.totals.protein} c={pm.totals.carbs} f={pm.totals.fat} />
                  </div>
                </div>
                <button className="btn-ghost !p-2" title="Trocar opções" onClick={() => setOverrides((o) => ({ ...o, [pm.meal]: (o[pm.meal] ?? 0) + 1 }))}>
                  <Shuffle size={16} />
                </button>
              </div>
              <ul className="my-3 flex-1 space-y-2">
                {pm.items.map((it) => (
                  <li key={it.foodKey} className="flex items-start justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{it.name}</div>
                      <div className="text-xs text-slate-500">
                        {it.grams} g{it.portion && ` · ${it.portion}`}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500">{it.kcal} kcal</span>
                  </li>
                ))}
                {!pm.items.length && <li className="text-sm text-slate-400">Sem opções compatíveis — ajuste suas restrições no perfil.</li>}
              </ul>
              <button
                className="btn-outline w-full"
                disabled={pending || !pm.items.length}
                onClick={() => {
                  setBusyMeal(pm.meal);
                  start(async () => {
                    await addFoodEntries(pm.items.map((it) => ({ date, meal: pm.meal, foodKey: it.foodKey, grams: it.grams, portionLabel: it.portion || `${it.grams} g` })));
                    setBusyMeal(null);
                  });
                }}
              >
                <CheckCheck size={16} /> {busyMeal === pm.meal ? "Registrando..." : "Comi isso — registrar"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {modal && <AddFoodModal key={modal} open onClose={() => setModal(null)} date={date} meal={modal} meals={meals} profile={profile} targets={targets} totals={totals} />}
    </div>
  );
}
