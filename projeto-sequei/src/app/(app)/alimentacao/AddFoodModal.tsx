"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Search, X, Minus, Plus, ArrowLeft, AlertTriangle, Check, ChefHat, PenLine, Star, ScanBarcode, Trash2, Library } from "lucide-react";
import { FOODS, FOOD_CATEGORIES, FOOD_MAP, Food, foodAllowed, macrosFor, searchFoods } from "@/lib/foods";
import { RECIPES, recipeNutrition, recipeCompatibility, type Recipe } from "@/lib/recipes";
import { MEALS, type Profile, type Targets } from "@/lib/calc";
import { addFoodEntries, toggleFavorite, deleteCustomFood, saveCustomFood, lookupBarcode, listLibrary, type LibraryData } from "@/app/actions";
import { fmt } from "@/components/ui";
import { MacroPills } from "@/components/Macros";
import { useT } from "@/lib/i18n";

type Totals = { kcal: number; protein: number; carbs: number; fat: number };
type Tab = "foods" | "recipes" | "mine" | "fav" | "barcode" | "custom";

function NutritionLabel({ m, grams }: { m: ReturnType<typeof macrosFor>; grams: number }) {
  const t = useT();
  const rows: [string, string, boolean?][] = [
    ["add.energy", `${m.kcal} ${t("common.kcal")}`, true],
    ["macro.protein", `${fmt(m.protein, 1)} ${t("common.grams")}`],
    ["macro.carbs", `${fmt(m.carbs, 1)} ${t("common.grams")}`],
    ["add.fiber", `${fmt(m.fiber, 1)} ${t("common.grams")}`],
    ["add.netCarbs", `${fmt(Math.max(m.carbs - m.fiber, 0), 1)} ${t("common.grams")}`],
    ["add.fatTotal", `${fmt(m.fat, 1)} ${t("common.grams")}`],
  ];
  return (
    <div className="rounded-2xl border-2 border-slate-900 p-3 font-mono text-[13px]">
      <div className="border-b-4 border-slate-900 pb-1 text-base font-black tracking-tight">{t("add.nutritionFacts")}</div>
      <div className="border-b border-slate-900 py-1 text-xs">{t("add.serving", { g: fmt(grams) })}</div>
      {rows.map(([l, v, b]) => (
        <div key={l} className={`flex justify-between border-b border-slate-300 py-1 ${b ? "font-bold" : ""}`}>
          <span className="whitespace-pre">{t(l)}</span>
          <span>{v}</span>
        </div>
      ))}
    </div>
  );
}

function blockedReason(f: Food, p: Profile) {
  const filter = { diet: p.diet, restrictions: p.restrictions, dislikes: p.dislikes };
  if (foodAllowed(f, filter)) {
    if (p.healthConditions.includes("diabetes") && f.gi === "alto") return "add.warnGi";
    if (p.healthConditions.includes("hipertensao") && f.sodium === "alto") return "add.warnSodium";
    return null;
  }
  return "add.warnProfile";
}


function FavButton({ kind, id, active, onToggle }: { kind: "food" | "recipe" | "custom"; id: string; active: boolean; onToggle: (kind: "food" | "recipe" | "custom", id: string) => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(kind, id); }}
      className="btn-ghost !p-2"
      aria-label={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
    >
      <Star size={16} className={active ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
    </button>
  );
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
  const [tab, setTab] = useState<Tab>("foods");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [sel, setSel] = useState<Food | null>(null);
  const [portionIdx, setPortionIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [meal, setMeal] = useState(initialMeal);
  const [pending, start] = useTransition();
  const t = useT();
  const [okMsg, setOkMsg] = useState("");
  const [custom, setCustom] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
  const [saveMine, setSaveMine] = useState(true);
  const [library, setLibrary] = useState<LibraryData>({ custom: [], favs: [] });
  const [bcCode, setBcCode] = useState("");
  const [bc, setBc] = useState<null | { name: string; kcal: number; protein: number; carbs: number; fat: number; fiber: number }>(null);
  const [bcError, setBcError] = useState("");

  useEffect(() => {
    if (open) listLibrary().then(setLibrary).catch(() => setLibrary({ custom: [], favs: [] }));
  }, [open]);

  const favSet = useMemo(() => new Set(library.favs.map((f) => `${f.kind}:${f.key}`)), [library.favs]);

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
      flash(t("add.flashAdded", { name: sel.name }));
      setSel(null);
    });
  };

  const choose = (f: Food) => {
    setSel(f);
    setPortionIdx(0);
    setQty(1);
  };

  const toggleFav = (kind: "food" | "recipe" | "custom", key: string) => {
    start(async () => {
      const r = await toggleFavorite(kind, key);
      setLibrary((lib) => {
        const id = `${kind}:${key}`;
        const exists = lib.favs.some((f) => `${f.kind}:${f.key}` === id);
        if (r.favorited && !exists) return { ...lib, favs: [...lib.favs, { kind, key }] };
        if (!r.favorited && exists) return { ...lib, favs: lib.favs.filter((f) => `${f.kind}:${f.key}` !== id) };
        return lib;
      });
    });
  };

  const addCustomItem = (id: number, name: string) => {
    start(async () => {
      await addFoodEntries([{ date, meal, customId: id }]);
      flash(t("add.flashAdded", { name }));
    });
  };

  const searchBc = () => {
    setBcError("");
    setBc(null);
    start(async () => {
      const r = await lookupBarcode(bcCode);
      if (r.ok && r.product) setBc(r.product);
      else setBcError(r.error ?? t("add.notFound"));
    });
  };

  const tabs: [Tab, string, typeof Search][] = [
    ["foods", "add.tabFoods", Search],
    ["recipes", "add.tabRecipes", ChefHat],
    ["mine", "add.tabMine", Library],
    ["fav", "add.tabFav", Star],
    ["barcode", "add.tabBarcode", ScanBarcode],
    ["custom", "add.tabCustom", PenLine],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white dark:bg-slate-100 shadow-2xl animate-fade-up sm:rounded-3xl">
        <div className="flex items-center gap-2 border-b border-slate-100 p-4">
          {sel ? (
            <button onClick={() => setSel(null)} className="btn-ghost !p-2" aria-label={t("common.back")}>
              <ArrowLeft size={18} />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-500">{t("add.addTo")}</div>
            <select value={meal} onChange={(e) => setMeal(e.target.value)} className="-ml-1 bg-transparent font-bold outline-none">
              {[...new Set([...meals, ...Object.keys(MEALS)])].map((k) => (
                <option key={k} value={k}>
                  {MEALS[k].emoji} {MEALS[k].label}
                </option>
              ))}
            </select>
          </div>
          <button onClick={onClose} className="btn-ghost !p-2" aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </div>

        {okMsg && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <Check size={16} /> {okMsg}
          </div>
        )}

        {!sel && (
          <div className="scrollbar-none flex gap-1 overflow-x-auto px-4 pt-3">
            {tabs.map(([k, l, Icon]) => (
              <button key={k} onClick={() => setTab(k)} className={`flex shrink-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl py-2 text-sm font-semibold ${tab === k ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                <Icon size={15} /> {t(l)}
              </button>
            ))}
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
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                    <AlertTriangle size={16} /> {t(blockedReason(sel, profile) ?? "")} — {t("add.warnSuffix")}
                  </div>
                )}
              </div>

              <div>
                <label className="label">{t("add.measure")}</label>
                <div className="flex flex-wrap gap-2">
                  {sel.portions.map((pp, i) => (
                    <button key={pp.l} onClick={() => { setPortionIdx(i); setQty(pp.l === "100 g" ? 1 : 1); }} className={portionIdx === i ? "chip-on" : "chip-off"}>
                      {pp.l} {pp.l !== "100 g" && <span className="text-xs opacity-60">({pp.g} g)</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="btn-ghost !p-3" onClick={() => setQty((v) => Math.max(0.5, +(v - 0.5).toFixed(1)))} aria-label={t("common.less")}>
                  <Minus size={18} />
                </button>
                <div className="flex-1 text-center">
                  <input type="number" step="0.5" min="0.25" value={qty} onChange={(e) => setQty(Math.max(0.1, Number(e.target.value) || 0.1))} className="input text-center text-xl font-bold" />
                  <div className="mt-1 text-xs text-slate-500">= {grams} g</div>
                </div>
                <button className="btn-ghost !p-3" onClick={() => setQty((v) => +(v + 0.5).toFixed(1))} aria-label={t("common.more")}>
                  <Plus size={18} />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <NutritionLabel m={m} grams={grams} />
                <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-700">{t("add.dayImpact")}</div>
                    <FavButton kind="food" id={sel.key} active={favSet.has(`food:${sel.key}`)} onToggle={toggleFav} />
                  </div>
                  {(
                    [
                      ["Calorias", totals.kcal, after.kcal, targets.kcal, "kcal", "bg-[#0f172a]"],
                      ["macro.protein", totals.protein, after.protein, targets.protein, "g", "bg-rose-500"],
                      ["macro.carbs", totals.carbs, after.carbs, targets.carbs, "g", "bg-amber-400"],
                      ["macro.fat", totals.fat, after.fat, targets.fat, "g", "bg-sky-500"],
                    ] as const
                  ).map(([l, before, aft, tgt, u, c]) => (
                    <div key={l}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-slate-600">{t(l)}</span>
                        <span className={`tabular-nums ${aft > tgt * 1.05 ? "font-bold text-rose-600 dark:text-rose-400" : "text-slate-500"}`}>
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
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className="input !pl-10" placeholder={t("add.searchPh")} />
              </div>
              <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
                <button onClick={() => setCat("")} className={`shrink-0 ${!cat ? "chip-on" : "chip-off"}`}>
                  {t("add.all")}
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
                    <div key={f.key} className={`flex w-full items-center gap-2 py-1 ${br ? "opacity-55" : ""}`}>
                      <button onClick={() => choose(f)} className="flex flex-1 items-center gap-3 py-2 text-left hover:bg-slate-50">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{f.name}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <MacroPills small kcal={f.kcal} p={f.p} c={f.c} f={f.f} />
                            <span className="text-[11px] text-slate-400">/100 {t("common.grams")}</span>
                          </div>
                          {br && <div className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">⚠ {t(br)}</div>}
                        </div>
                        <Plus size={18} className="text-emerald-600 dark:text-emerald-400" />
                      </button>
                      <FavButton kind="food" id={f.key} active={favSet.has(`food:${f.key}`)} onToggle={toggleFav} />
                    </div>
                  );
                })}
                {!list.length && <div className="py-8 text-center text-sm text-slate-500">{t("add.noFoods")}</div>}
              </div>
            </div>
          ) : tab === "recipes" ? (
            <div className="grid gap-2">
              {RECIPES.map((r: Recipe) => {
                const n = recipeNutrition(r);
                const comp = recipeCompatibility(r, profile.diet, profile.restrictions, profile.dislikes);
                return (
                  <div key={r.key} className={`flex items-center gap-3 rounded-2xl border border-slate-200 p-3 ${comp.ok ? "" : "opacity-55"}`}>
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${r.gradient} text-2xl`}>{r.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{r.name}</div>
                      <MacroPills small kcal={n.kcal} p={n.protein} c={n.carbs} f={n.fat} />
                      {!comp.ok && <div className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">⚠ {comp.reasons[0]}</div>}
                    </div>
                    <FavButton kind="recipe" id={r.key} active={favSet.has(`recipe:${r.key}`)} onToggle={toggleFav} />
                    <button
                      className="btn-primary !px-3"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          await addFoodEntries([{ date, meal, recipeKey: r.key, servings: 1 }]);
                          flash(t("add.flashAdded", { name: r.name }));
                        })
                      }
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : tab === "mine" ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">{t("add.mineHint")}</p>
              {library.custom.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{c.name}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <MacroPills small kcal={c.kcal} p={c.protein} c={c.carbs} f={c.fat} />
                      <span className="text-[11px] text-slate-400">/{c.portionLabel || `${c.grams} g`}</span>
                    </div>
                  </div>
                  <FavButton kind="custom" id={String(c.id)} active={favSet.has(`custom:${c.id}`)} onToggle={toggleFav} />
                  <button
                    className="btn-ghost !p-2 text-rose-500"
                    aria-label={t("common.delete")}
                    onClick={() =>
                      start(async () => {
                        await deleteCustomFood(c.id);
                        setLibrary((lib) => ({ ...lib, custom: lib.custom.filter((x) => x.id !== c.id) }));
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                  <button className="btn-primary !px-3" disabled={pending} onClick={() => addCustomItem(c.id, c.name)} aria-label={t("common.add")}>
                    <Plus size={16} />
                  </button>
                </div>
              ))}
              {!library.custom.length && <div className="py-8 text-center text-sm text-slate-500">Nenhum alimento salvo ainda — use a aba “Manual” e marque “salvar”.</div>}
            </div>
          ) : tab === "fav" ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">{t("add.favHint")}</p>
              {library.favs.map((fv) => {
                const id = `${fv.kind}:${fv.key}`;
                if (fv.kind === "food") {
                  const f = FOOD_MAP[fv.key];
                  if (!f) return null;
                  return (
                    <div key={id} className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{f.name}</div>
                        <MacroPills small kcal={f.kcal} p={f.p} c={f.c} f={f.f} />
                      </div>
                      <FavButton kind="food" id={fv.key} active={favSet.has(`food:${fv.key}`)} onToggle={toggleFav} />
                      <button className="btn-primary !px-3" disabled={pending} onClick={() => choose(f)} aria-label={t("common.add")}>
                        <Plus size={16} />
                      </button>
                    </div>
                  );
                }
                if (fv.kind === "recipe") {
                  const r = RECIPES.find((x) => x.key === fv.key);
                  if (!r) return null;
                  const n = recipeNutrition(r);
                  return (
                    <div key={id} className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3">
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${r.gradient} text-xl`}>{r.emoji}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{r.name}</div>
                        <MacroPills small kcal={n.kcal} p={n.protein} c={n.carbs} f={n.fat} />
                      </div>
                      <FavButton kind="recipe" id={fv.key} active={favSet.has(`recipe:${fv.key}`)} onToggle={toggleFav} />
                      <button
                        className="btn-primary !px-3"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            await addFoodEntries([{ date, meal, recipeKey: r.key, servings: 1 }]);
                            flash(t("add.flashAdded", { name: r.name }));
                          })
                        }
                        aria-label={t("common.add")}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  );
                }
                const c = library.custom.find((x) => String(x.id) === fv.key);
                if (!c) return null;
                return (
                  <div key={id} className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{c.name}</div>
                      <MacroPills small kcal={c.kcal} p={c.protein} c={c.carbs} f={c.fat} />
                    </div>
                    <FavButton kind="custom" id={fv.key} active={favSet.has(`custom:${fv.key}`)} onToggle={toggleFav} />
                    <button className="btn-primary !px-3" disabled={pending} onClick={() => addCustomItem(c.id, c.name)} aria-label={t("common.add")}>
                      <Plus size={16} />
                    </button>
                  </div>
                );
              })}
              {!library.favs.length && <div className="py-8 text-center text-sm text-slate-500">{t("add.noFav")}</div>}
            </div>
          ) : tab === "barcode" ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">{t("add.barcodeHint")}</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ScanBarcode size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={bcCode}
                    onChange={(e) => setBcCode(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    className="input !pl-10"
                    placeholder={t("add.barcodePh")}
                  />
                </div>
                <button className="btn-primary" onClick={searchBc} disabled={pending || bcCode.length < 6}>
                  {pending ? "..." : t("add.search")}
                </button>
              </div>
              {bcError && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                  <AlertTriangle size={16} /> {bcError}
                </div>
              )}
              {bc && (
                <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                  <div>
                    <div className="text-base font-bold">{bc.name}</div>
                    <div className="mt-1">
                      <MacroPills small kcal={bc.kcal} p={bc.protein} c={bc.carbs} f={bc.fat} />
                      <span className="ml-2 text-[11px] text-slate-400">/100 {t("common.grams")}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-primary flex-1"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          await addFoodEntries([{ date, meal, custom: { name: bc.name, kcal: bc.kcal, protein: bc.protein, carbs: bc.carbs, fat: bc.fat, fiber: bc.fiber }, portionLabel: "100 g" }]);
                          flash(t("add.flashAdded", { name: bc.name }));
                          setBc(null);
                          setBcCode("");
                        })
                      }
                    >
                      <Plus size={16} /> {t("add.add100")}
                    </button>
                    <button
                      className="btn-ghost"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          await saveCustomFood({ name: bc.name, grams: 100, portionLabel: "100 g", kcal: bc.kcal, protein: bc.protein, carbs: bc.carbs, fat: bc.fat, fiber: bc.fiber });
                          const lib = await listLibrary();
                          setLibrary(lib);
                          flash(t("add.savedFlash"));
                        })
                      }
                    >
                      {t("common.save")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">{t("add.manualHint")}</p>
              <div>
                <label className="label">{t("add.name")}</label>
                <input className="input" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder={t("add.namePh")} />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(["kcal", "protein", "carbs", "fat"] as const).map((k) => (
                  <div key={k}>
                    <label className="label">{{ kcal: "Kcal", protein: "Proteína g", carbs: "Carbo g", fat: "Gordura g" }[k]}</label>
                    <input type="number" inputMode="decimal" className="input" value={custom[k]} onChange={(e) => setCustom({ ...custom, [k]: e.target.value })} />
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={saveMine} onChange={(e) => setSaveMine(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                {t("add.saveToo")}
              </label>
              <button
                className="btn-primary w-full"
                disabled={!custom.name || !custom.kcal || pending}
                onClick={() =>
                  start(async () => {
                    if (saveMine) {
                      await saveCustomFood({ name: custom.name, grams: 100, portionLabel: "100 g", kcal: +custom.kcal || 0, protein: +custom.protein || 0, carbs: +custom.carbs || 0, fat: +custom.fat || 0 });
                      setLibrary(await listLibrary());
                    }
                    await addFoodEntries([{ date, meal, custom: { name: custom.name, kcal: +custom.kcal, protein: +custom.protein || 0, carbs: +custom.carbs || 0, fat: +custom.fat || 0 }, portionLabel: "100 g" }]);
                    flash(t("add.flashAdded", { name: custom.name }));
                    setCustom({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
                  })
                }
              >
                <Plus size={16} /> {t("common.add")}
              </button>
            </div>
          )}
        </div>

        {sel && m && (
          <div className="border-t border-slate-100 p-4">
            <button className="btn-primary w-full !py-3 text-base" onClick={addSelected} disabled={pending}>
              {pending ? t("add.adding") : `${t("common.add")} ${grams} ${t("common.grams")} · ${m.kcal} ${t("common.kcal")}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
