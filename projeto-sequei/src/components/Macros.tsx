"use client";

// Macros com rótulos traduzidos (client island — pode usar useT).
import { Bar, fmt, MACRO_COLORS } from "./ui";
import { useT } from "@/lib/i18n";

export function MacroRow({ k, value, target }: { k: keyof typeof MACRO_COLORS; value: number; target: number }) {
  const t = useT();
  const m = MACRO_COLORS[k];
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-700">{t(m.label)}</span>
        <span className="tabular-nums text-slate-500">
          <b className={m.text}>{Math.round(value)}</b> / {target} {t("common.grams")}
        </span>
      </div>
      <Bar value={value} max={target} color={m.bar} />
    </div>
  );
}

export function MacroPills({ p, c, f, kcal, small }: { p: number; c: number; f: number; kcal?: number; small?: boolean }) {
  const t = useT();
  const cls = small ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs";
  return (
    <div className="flex flex-wrap items-center gap-1">
      {kcal !== undefined && <span className={`rounded-md bg-[#0f172a] font-semibold text-white ${cls}`}>{Math.round(kcal)} {t("common.kcal")}</span>}
      <span className={`rounded-md bg-rose-50 font-semibold text-rose-600 dark:text-rose-400 ${cls}`}>{t("macro.p")} {fmt(p)}</span>
      <span className={`rounded-md bg-amber-50 font-semibold text-amber-600 dark:text-amber-400 ${cls}`}>{t("macro.c")} {fmt(c)}</span>
      <span className={`rounded-md bg-sky-50 font-semibold text-sky-600 dark:text-sky-400 ${cls}`}>{t("macro.g")} {fmt(f)}</span>
    </div>
  );
}
