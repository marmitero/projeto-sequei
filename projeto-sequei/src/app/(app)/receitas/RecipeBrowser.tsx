"use client";

import { useT } from "@/lib/i18n";

import { useMemo, useState, useTransition } from "react";
import { Clock, Users, X, Check, Plus, AlertTriangle, Sparkles, Leaf } from "lucide-react";
import { RECIPES, RECIPE_CATEGORIES, recipeNutrition, recipeCompatibility, type Recipe } from "@/lib/recipes";
import { FOOD_MAP, macrosFor } from "@/lib/foods";
import { MEALS, mealsFor, type Profile } from "@/lib/calc";
import { addFoodEntries } from "@/app/actions";
import { fmt } from "@/components/ui";
import { MacroPills } from "@/components/Macros";

type Rem = { kcal: number; protein: number; carbs: number; fat: number };

export default function RecipeBrowser({ profile, today, initial, remaining }: { profile: Profile; today: string; initial: string | null; remaining: Rem }) {
  const t = useT();
  const [cat, setCat] = useState<string>("");
  const [onlyMine, setOnlyMine] = useState(true);
  const [sort, setSort] = useState("fit");
  const [open, setOpen] = useState<Recipe | null>(RECIPES.find((r) => r.key === initial) ?? null);

  const list = useMemo(() => {
    return RECIPES.map((r) => {
      const n = recipeNutrition(r);
      const comp = recipeCompatibility(r, profile.diet, profile.restrictions, profile.dislikes);
      const fit = Math.abs(n.protein - Math.max(remaining.protein, 0) * 0.35) + Math.abs(n.carbs - Math.max(remaining.carbs, 0) * 0.3) * 0.7 + (n.kcal > Math.max(remaining.kcal, 150) ? 60 : 0);
      return { r, n, comp, fit };
    })
      .filter((x) => (!cat || x.r.category === cat) && (!onlyMine || x.comp.ok))
      .sort((a, b) => {
        if (sort === "protein") return b.n.protein - a.n.protein;
        if (sort === "carbs") return a.n.netCarbs - b.n.netCarbs;
        if (sort === "kcal") return a.n.kcal - b.n.kcal;
        return a.fit - b.fit;
      });
  }, [cat, onlyMine, sort, profile, remaining]);

  return (
    <div className="space-y-5">
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1">
          <button onClick={() => setCat("")} className={`shrink-0 ${!cat ? "chip-on" : "chip-off"}`}>
            {t("recipe.all")}
          </button>
          {Object.entries(RECIPE_CATEGORIES).map(([k, l]) => (
            <button key={k} onClick={() => setCat(k)} className={`shrink-0 ${cat === k ? "chip-on" : "chip-off"}`}>
              {t(l)}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input !w-auto !py-2">
            <option value="fit">{t("recipe.bestToday")}</option>
            <option value="protein">{t("recipe.moreProtein")}</option>
            <option value="carbs">{t("recipe.lessCarbs")}</option>
            <option value="kcal">{t("recipe.lessKcal")}</option>
          </select>
          <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-slate-600">
            <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
            {t("recipe.onlyCompatible")}
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
        <Sparkles size={16} className="shrink-0" />
        Hoje ainda restam {fmt(Math.max(remaining.kcal, 0))} kcal, {fmt(Math.max(remaining.protein, 0))} g de proteína e {fmt(Math.max(remaining.carbs, 0))} g de carbo. “Melhor para hoje” usa esses números.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map(({ r, n, comp }, i) => (
          <button key={r.key} onClick={() => setOpen(r)} className="card group overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-xl">
            <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${r.gradient}`}>
              <span className="text-7xl drop-shadow-lg transition group-hover:scale-110">{r.emoji}</span>
              <span className="absolute left-3 top-3 rounded-full bg-white/90 dark:bg-slate-100/90 px-2.5 py-1 text-[11px] font-bold text-slate-700">{RECIPE_CATEGORIES[r.category]}</span>
              {sort === "fit" && i < 3 && comp.ok && <span className="absolute right-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">★ {t("recipe.idealToday")}</span>}
              <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white">{fmt(n.netCarbs, 1)} g carbo líq.</span>
            </div>
            <div className="p-4">
              <div className="font-bold group-hover:text-emerald-700 dark:text-emerald-300">{r.name}</div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{r.description}</p>
              <div className="mt-3">
                <MacroPills kcal={n.kcal} p={n.protein} c={n.carbs} f={n.fat} />
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock size={13} /> {r.time} min
                </span>
                <span className="flex items-center gap-1">
                  <Users size={13} /> {r.servings} porç.
                </span>
                <span>{r.difficulty}</span>
              </div>
              {!comp.ok && (
                <div className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={13} /> {comp.reasons.join(" · ")}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
      {!list.length && <div className="card p-10 text-center text-slate-500">{t("recipe.noCompatible")}</div>}

      {open && <RecipeModal r={open} profile={profile} today={today} onClose={() => setOpen(null)} />}
    </div>
  );
}

function RecipeModal({ r, profile, today, onClose }: { r: Recipe; profile: Profile; today: string; onClose: () => void }) {  const t = useT();

  const n = recipeNutrition(r);
  const comp = recipeCompatibility(r, profile.diet, profile.restrictions, profile.dislikes);
  const meals = mealsFor(profile.mealsPerDay);
  const [meal, setMeal] = useState(r.category === "cafe" ? "cafe" : r.category === "refeicao" || r.category === "pizza" ? "jantar" : meals.includes("lanche_tarde") ? "lanche_tarde" : meals[meals.length - 1]);
  const [servings, setServings] = useState(1);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [checked, setChecked] = useState<number[]>([]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white dark:bg-slate-100 animate-fade-up sm:rounded-3xl">
        <div className={`relative flex h-40 shrink-0 items-center justify-center bg-gradient-to-br ${r.gradient} sm:h-48`}>
          <span className="text-8xl drop-shadow-xl">{r.emoji}</span>
          <button onClick={onClose} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 dark:bg-slate-100/90 text-slate-700" aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          <div className="flex flex-wrap gap-1.5">
            {r.tags.map((t) => (
              <span key={t} className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <Leaf size={11} /> {t}
              </span>
            ))}
          </div>
          <h2 className="mt-2 text-2xl font-bold">{r.name}</h2>
          <p className="mt-1 text-slate-600">{r.description}</p>
          <div className="mt-2 flex gap-4 text-sm text-slate-500">
            <span>⏱ {r.time} min</span>
            <span>🍽 rende {r.servings} porção(ões)</span>
            <span>📊 {r.difficulty}</span>
          </div>
          {!comp.ok && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle size={16} /> Atenção: {comp.reasons.join(" · ")}
            </div>
          )}

          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[
              ["Kcal", fmt(n.kcal), "bg-[#0f172a] text-white"],
              ["macro.protein", `${fmt(n.protein, 1)} g`, "bg-rose-50 text-rose-700 dark:text-rose-300"],
              ["recipe.carbsShort", `${fmt(n.carbs, 1)} g`, "bg-amber-50 text-amber-700 dark:text-amber-300"],
              ["recipe.netCarbs", `${fmt(n.netCarbs, 1)} g`, "bg-orange-50 text-orange-700"],
              ["macro.fat", `${fmt(n.fat, 1)} g`, "bg-sky-50 text-sky-700 dark:text-sky-300"],
              ["macro.fiber", `${fmt(n.fiber, 1)} g`, "bg-lime-50 text-lime-700"],
            ].map(([l, v, c]) => (
              <div key={l} className={`rounded-2xl p-2.5 text-center ${c}`}>
                <div className="text-[10px] font-semibold uppercase opacity-80">{l}</div>
                <div className="font-bold">{v}</div>
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-400">Por porção (~{n.gramsPerServing} g). Carbo líquido = carboidrato − fibras.</p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-bold">{t("recipe.ingredients")}</h3>
              <ul className="space-y-1.5">
                {r.ingredients.map((ing, i) => {
                  const f = ing.key ? FOOD_MAP[ing.key] : null;
                  const m = f && ing.g ? macrosFor(f, ing.g) : null;
                  const on = checked.includes(i);
                  return (
                    <li key={i}>
                      <button onClick={() => setChecked(on ? checked.filter((x) => x !== i) : [...checked, i])} className="flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-slate-50">
                        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}>{on && <Check size={12} />}</span>
                        <span className={`flex-1 text-sm ${on ? "text-slate-400 line-through" : "text-slate-700"}`}>{ing.text}</span>
                        {m && <span className="shrink-0 text-[11px] tabular-nums text-slate-400">{m.kcal} kcal</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-bold">{t("recipe.steps")}</h3>
              <ol className="space-y-3">
                {r.steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-xs font-bold text-white">{i + 1}</span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 gap-2">
            <select className="input !py-2" value={meal} onChange={(e) => setMeal(e.target.value)}>
              {Object.entries(MEALS).map(([k, m]) => (
                <option key={k} value={k}>
                  {m.emoji} {t(m.label)}
                </option>
              ))}
            </select>
            <select className="input !w-28 !py-2" value={servings} onChange={(e) => setServings(Number(e.target.value))}>
              {[0.5, 1, 1.5, 2, 3].map((s) => (
                <option key={s} value={s}>
                  {String(s).replace(".", ",")} porç.
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn-primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await addFoodEntries([{ date: today, meal, recipeKey: r.key, servings }]);
                setDone(true);
                setTimeout(() => setDone(false), 2000);
              })
            }
          >
            {done ? <Check size={16} /> : <Plus size={16} />} {done ? t("recipe.logged") : `${t("dash.log")} · ${Math.round(n.kcal * servings)} ${t("common.kcal")}`}
          </button>
        </div>
      </div>
    </div>
  );
}
