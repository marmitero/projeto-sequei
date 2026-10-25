"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Search, ArrowUpDown, X, Scale3d, GitCompare } from "lucide-react";
import { FOODS, FOOD_CATEGORIES, Food, foodAllowed, macrosFor, searchFoods } from "@/lib/foods";
import type { Profile } from "@/lib/calc";
import { MacroPills, fmt } from "@/components/ui";

type SortKey = "name" | "kcal" | "p" | "c" | "f" | "fib" | "dens";

function SortHead({ k, sort, onSort, children }: { k: SortKey; sort: SortKey; onSort: (k: SortKey) => void; children: ReactNode }) {
  return (
    <th className="px-2 py-3 text-right first:text-left">
      <button onClick={() => onSort(k)} className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide ${sort === k ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500"}`}>
        {children} <ArrowUpDown size={12} />
      </button>
    </th>
  );
}

function badges(f: Food) {
  const b: { l: string; c: string }[] = [];
  if (f.kcal > 0 && (f.p * 4) / f.kcal >= 0.4 && f.p >= 8) b.push({ l: "Rico em proteína", c: "bg-rose-50 text-rose-700 dark:text-rose-300" });
  if (f.c - f.fib <= 5 && f.kcal > 5) b.push({ l: "Low-carb", c: "bg-emerald-50 text-emerald-700 dark:text-emerald-300" });
  if (f.fib >= 3) b.push({ l: "Fonte de fibras", c: "bg-lime-50 text-lime-700" });
  if (f.gi) b.push({ l: `IG ${f.gi}`, c: f.gi === "alto" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-600" });
  if (f.sodium) b.push({ l: "Sódio alto", c: "bg-amber-50 text-amber-700 dark:text-amber-300" });
  return b;
}

export default function FoodTable({ profile }: { profile: Profile }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [dir, setDir] = useState<1 | -1>(1);
  const [grams, setGrams] = useState(100);
  const [onlyMine, setOnlyMine] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);

  const filter = { diet: profile.diet, restrictions: profile.restrictions, dislikes: profile.dislikes };

  const list = useMemo(() => {
    let l = searchFoods(q, cat ? FOODS.filter((f) => f.cat === cat) : FOODS);
    if (onlyMine) l = l.filter((f) => foodAllowed(f, filter));
    const val = (f: Food) => (sort === "dens" ? (f.kcal ? f.p / f.kcal : 0) : sort === "name" ? 0 : f[sort]);
    return [...l].sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) * dir : (val(b) - val(a)) * dir));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, cat, sort, dir, onlyMine, profile]);

  const toggleSort = (k: SortKey) => {
    if (sort === k) setDir((d) => (d === 1 ? -1 : 1));
    else {
      setSort(k);
      setDir(1);
    }
  };
  const toggleCompare = (k: string) => setCompare((c) => (c.includes(k) ? c.filter((x) => x !== k) : c.length >= 3 ? [...c.slice(1), k] : [...c, k]));

  const cmpFoods = compare.map((k) => FOODS.find((f) => f.key === k)!).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="input !pl-10" placeholder={`Buscar entre ${FOODS.length} alimentos...`} />
          </div>
          <div className="flex items-center gap-2">
            <Scale3d size={18} className="text-slate-400" />
            <span className="text-sm text-slate-500">Valores para</span>
            <input type="number" className="input !w-24" value={grams} min={1} onChange={(e) => setGrams(Math.max(1, Number(e.target.value)))} />
            <span className="text-sm text-slate-500">g</span>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="scrollbar-none -mx-1 flex flex-1 gap-2 overflow-x-auto px-1">
            <button onClick={() => setCat("")} className={`shrink-0 ${!cat ? "chip-on" : "chip-off"}`}>
              Todas
            </button>
            {FOOD_CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`shrink-0 ${cat === c ? "chip-on" : "chip-off"}`}>
                {c}
              </button>
            ))}
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /> Só compatíveis comigo
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 md:hidden">
          Ordenar:
          {(
            [
              ["name", "Nome"],
              ["p", "Proteína"],
              ["dens", "Proteína/kcal"],
              ["c", "Carbo"],
              ["kcal", "Kcal"],
              ["fib", "Fibras"],
            ] as [SortKey, string][]
          ).map(([k, l]) => (
            <button key={k} onClick={() => toggleSort(k)} className={sort === k ? "chip-on !py-1 !text-xs" : "chip-off !py-1 !text-xs"}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {cmpFoods.length > 0 && (
        <div className="card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold">
              <GitCompare size={18} className="text-emerald-600 dark:text-emerald-400" /> Comparando ({grams} g)
            </h3>
            <button className="text-sm text-slate-500" onClick={() => setCompare([])}>
              Limpar
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {cmpFoods.map((f) => {
              const m = macrosFor(f, grams);
              const max = Math.max(...cmpFoods.map((x) => macrosFor(x, grams).kcal), 1);
              return (
                <div key={f.key} className="rounded-2xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold">{f.name}</div>
                    <button onClick={() => toggleCompare(f.key)} className="text-slate-400" aria-label="Remover">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="mt-2 text-2xl font-bold">{m.kcal} kcal</div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-[#0f172a]" style={{ width: `${(m.kcal / max) * 100}%` }} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                    <span className="text-rose-600 dark:text-rose-400">Proteína {fmt(m.protein, 1)} g</span>
                    <span className="text-amber-600 dark:text-amber-400">Carbo {fmt(m.carbs, 1)} g</span>
                    <span className="text-sky-600 dark:text-sky-400">Gordura {fmt(m.fat, 1)} g</span>
                    <span className="text-lime-700">Fibras {fmt(m.fiber, 1)} g</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Desktop/tablet: tabela */}
      <div className="card hidden overflow-hidden md:block">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white/95 dark:bg-slate-100/95 backdrop-blur">
              <tr className="border-b border-slate-100">
                <SortHead k="name" sort={sort} onSort={toggleSort}>Alimento</SortHead>
                <SortHead k="kcal" sort={sort} onSort={toggleSort}>Kcal</SortHead>
                <SortHead k="p" sort={sort} onSort={toggleSort}>Prot.</SortHead>
                <SortHead k="c" sort={sort} onSort={toggleSort}>Carbo</SortHead>
                <SortHead k="f" sort={sort} onSort={toggleSort}>Gord.</SortHead>
                <SortHead k="fib" sort={sort} onSort={toggleSort}>Fibra</SortHead>
                <SortHead k="dens" sort={sort} onSort={toggleSort}>P/100kcal</SortHead>
                <th className="px-2 py-3 text-xs font-semibold uppercase text-slate-500">Comparar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {list.map((f) => {
                const m = macrosFor(f, grams);
                const ok = foodAllowed(f, filter);
                return (
                  <tr key={f.key} className={`hover:bg-slate-50 ${ok ? "" : "opacity-50"}`}>
                    <td className="px-2 py-2.5">
                      <div className="font-medium">{f.name}</div>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        <span className="text-[11px] text-slate-400">{f.cat} · {f.src}</span>
                        {badges(f).map((b) => (
                          <span key={b.l} className={`rounded px-1.5 text-[10px] font-semibold ${b.c}`}>
                            {b.l}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 text-right font-semibold tabular-nums">{m.kcal}</td>
                    <td className="px-2 text-right tabular-nums text-rose-600 dark:text-rose-400">{fmt(m.protein, 1)}</td>
                    <td className="px-2 text-right tabular-nums text-amber-600 dark:text-amber-400">{fmt(m.carbs, 1)}</td>
                    <td className="px-2 text-right tabular-nums text-sky-600 dark:text-sky-400">{fmt(m.fat, 1)}</td>
                    <td className="px-2 text-right tabular-nums text-lime-700">{fmt(m.fiber, 1)}</td>
                    <td className="px-2 text-right tabular-nums text-slate-500">{f.kcal ? fmt((f.p / f.kcal) * 100, 1) : "—"}</td>
                    <td className="px-2 text-center">
                      <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={compare.includes(f.key)} onChange={() => toggleCompare(f.key)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Celular: cards */}
      <div className="grid gap-2 md:hidden">
        {list.map((f) => {
          const m = macrosFor(f, grams);
          const ok = foodAllowed(f, filter);
          return (
            <div key={f.key} className={`card p-3 ${ok ? "" : "opacity-50"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{f.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {f.cat} · {f.portions[0].l} = {f.portions[0].g} g
                  </div>
                </div>
                <input type="checkbox" aria-label="Comparar" className="mt-1 h-4 w-4 accent-emerald-600" checked={compare.includes(f.key)} onChange={() => toggleCompare(f.key)} />
              </div>
              <div className="mt-2">
                <MacroPills kcal={m.kcal} p={m.protein} c={m.carbs} f={m.fat} />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {badges(f).map((b) => (
                  <span key={b.l} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${b.c}`}>
                    {b.l}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-slate-400">Fonte: Tabela Brasileira de Composição de Alimentos (TACO 4ª ed., NEPA/UNICAMP) e USDA FoodData Central. Valores por 100 g, ajustados à porção escolhida.</p>
    </div>
  );
}
