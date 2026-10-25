import { Flame, Trophy } from "lucide-react";
import type { Badge, Streaks } from "@/lib/gamification";

/** Painel de sequências e marcos (gamificação) — apresentação pura. */
export default function GamificationPanel({ streaks, badges, earned }: { streaks: Streaks; badges: Badge[]; earned: number }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy size={18} className="text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-xl font-bold">Sequências e marcos</h2>
        <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          {earned}/{badges.length} marcos
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["🍽️", "Diário", streaks.food, `recorde ${streaks.bestFood}`],
            ["💧", "Água", streaks.water, "dias seguidos"],
            ["💪", "Treino", streaks.workout, "dias seguidos"],
            ["🔥", "Constância", Math.max(streaks.food, streaks.water), "melhor sequência ativa"],
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
        <div className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Conquistas</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {badges.map((b) => (
            <div
              key={b.key}
              title={b.desc}
              className={`rounded-2xl border p-3 text-center transition ${b.earned ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50 opacity-70"}`}
            >
              <div className={`text-2xl ${b.earned ? "" : "grayscale"}`}>{b.icon}</div>
              <div className="mt-1 truncate text-[11px] font-semibold">{b.label}</div>
              <div className="text-[10px] text-slate-400">{b.progress}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
