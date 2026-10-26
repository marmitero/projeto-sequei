"use client";

import { useT } from "@/lib/i18n";

import { useCallback, useSyncExternalStore } from "react";
import { Check, ListChecks, RotateCcw } from "lucide-react";
import type { ShoppingGroup } from "@/lib/shopping";

// Store externo mínimo (localStorage + listeners) — evita setState em efeito e mantém hidratação estável.
const listeners = new Map<string, Set<() => void>>();
const snapshotCache = new Map<string, string>();

function readSnapshot(key: string): string {
  try {
    return localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
}

function notify(key: string) {
  snapshotCache.delete(key);
  listeners.get(key)?.forEach((l) => l());
}

function subscribe(key: string, cb: () => void) {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(cb);
  return () => {
    set!.delete(cb);
  };
}

function getSnapshot(key: string): string {
  if (typeof window === "undefined") return "[]";
  if (!snapshotCache.has(key)) snapshotCache.set(key, readSnapshot(key));
  return snapshotCache.get(key)!;
}

function writeSnapshot(key: string, ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* storage indisponível */
  }
  notify(key);
}

export default function ShoppingList({ groups, weekKey }: { groups: ShoppingGroup[]; weekKey: string }) {
  const t = useT();
  const storageKey = `fitvida:compras:${weekKey}`;
  const raw = useSyncExternalStore(
    useCallback((cb: () => void) => subscribe(storageKey, cb), [storageKey]),
    useCallback(() => getSnapshot(storageKey), [storageKey]),
    () => "[]",
  );
  const checked = new Set<string>(JSON.parse(raw) as string[]);

  const toggle = (k: string) => {
    const s = new Set(checked);
    if (s.has(k)) s.delete(k);
    else s.add(k);
    writeSnapshot(storageKey, [...s]);
  };

  const total = groups.reduce((a, g) => a + g.items.length, 0);
  const done = checked.size;

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <ListChecks size={18} className="text-emerald-600 dark:text-emerald-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">
            {done} de {total} itens comprados
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
        </div>
        <button className="btn-ghost !py-2 text-xs" onClick={() => writeSnapshot(storageKey, [])}>
          <RotateCcw size={14} /> {t("shop.clearChecks")}
        </button>
      </div>

      {groups.map((g) => (
        <div key={g.cat} className="card p-4 sm:p-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">{g.cat}</h2>
          <div className="divide-y divide-slate-100">
            {g.items.map((it) => {
              const k = it.foodKey;
              const on = checked.has(k);
              return (
                <button key={k} onClick={() => toggle(k)} className="flex w-full items-center gap-3 py-2.5 text-left">
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${on ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}>
                    {on && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-medium ${on ? "text-slate-400 line-through" : ""}`}>{it.name}</span>
                    <span className={`text-xs ${on ? "text-slate-300" : "text-slate-500"}`}>
                      {it.portion} · ~{it.kcal} kcal
                    </span>
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${on ? "text-slate-300" : "text-emerald-600 dark:text-emerald-400"}`}>{it.totalGrams} g</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
