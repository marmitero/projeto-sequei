"use client";

import { Flame, Trophy } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { Badge, Streaks } from "@/lib/gamification";

/** Painel de sequências e marcos (gamificação) — apresentação pura. */
export default function GamificationPanel({ streaks, badges, earned }: { streaks: Streaks; badges: Badge[]; earned: number }) {
  const t = useT();
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy size={18} className="text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-xl font-bold">{t("game.title")}</h2>
        <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          {earned}/{badges.length} {t("game.badges")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["🍽️", t("game.daily"), streaks.food, t("game.record", { n: streaks.bestFood })],
            ["💧", t("nav.water"), streaks.water, t("game.dayStreak")],
            ["💪", t("nav.workout"), streaks.workout, t("game.dayStreak")],
            ["🔥", t("game.consistency"), Math.max(streaks.food, streaks.water), t("game.bestActive")],
          ] as const
        ).map(([icon, label, value, sub]) => (
          <div key={label} className="card p-4 text-center">
            <div className="text-2xl">{icon}</div>
            <div className="mt-1 flex items-center justify-center gap-1 text-2xl font-black tabular-nums">
              {value > 0 && <Flame size={18} className="text-orange-500" />}
              {value}
            </div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</div>
            <div className="text-[11px] text-slate-400">{sub}</div>
          </div>
        ))}
      </div>

      <div className="card p-4 sm:p-5">
        <div className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("game.achievements")}</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {badges.map((b) => {
            const medal = ["🥉", "🥈", "🥇", "🏆"][Number(b.key.slice(-1)) - 1] ?? "⭐";
            const unit = t(b.progressVars.unitKey);
            return (
              <div
                key={b.key}
                title={t(b.descKey, { target: b.progressVars.target, unit })}
                className={`rounded-2xl border p-3 text-center transition ${b.earned ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50 opacity-70"}`}
              >
                <div className={`text-2xl ${b.earned ? "" : "grayscale"}`}>{b.icon}</div>
                <div className="mt-1 truncate text-[11px] font-semibold">{medal} {t(b.labelKey)}</div>
                <div className="text-[10px] text-slate-400">{t(b.progressKey, { ...b.progressVars, unit })}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
