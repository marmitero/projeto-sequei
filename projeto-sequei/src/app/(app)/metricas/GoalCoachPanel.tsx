"use client";

import { useState } from "react";
import { Sparkles, Undo2 } from "lucide-react";
import { applyTargetOverrides, clearTargetOverrides } from "@/app/actions";
import type { Recommendation, TargetOverrides } from "@/lib/goalcoach";

const AREA_ICON: Record<Recommendation["area"], string> = { peso: "⚖️", kcal: "🔥", agua: "💧", treino: "💪", hábito: "📌" };

/**
 * Ajuste inteligente de metas: recomendações determinísticas sobre aderência real
 * (registro, água, treino) e tendência de peso vs. projeção — com aplicação em 1 clique.
 */
export default function GoalCoachPanel({ recs, hasOverrides }: { recs: Recommendation[]; hasOverrides: boolean }) {
  const [items, setItems] = useState(recs);
  const [applied, setApplied] = useState<string | null>(null);
  const [overrideOn, setOverrideOn] = useState(hasOverrides);

  const apply = async (rec: Recommendation) => {
    if (!rec.apply) return;
    const partial: TargetOverrides = rec.apply;
    await applyTargetOverrides(partial);
    setApplied(rec.key);
    setOverrideOn(true);
    setTimeout(() => setApplied(null), 2000);
  };

  const restore = async () => {
    await clearTargetOverrides();
    setOverrideOn(false);
    setItems((xs) => xs.map((x) => ({ ...x, apply: x.apply ? { ...x.apply } : undefined })));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-xl font-bold">Ajuste inteligente de metas</h2>
        {overrideOn && (
          <button className="btn-ghost ml-auto !px-3 !py-1.5 text-xs" onClick={restore}>
            <Undo2 size={14} /> Restaurar metas automáticas
          </button>
        )}
      </div>
      <p className="text-sm text-slate-500">
        Análise determinística das últimas 4 semanas: registro de refeições, hidratação, treinos e tendência de peso vs. a projeção do seu perfil. Sugestões aplicáveis ajustam a meta em até ±100 kcal (ou 250 ml de água), sempre dentro de limites seguros.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((r) => (
          <div key={r.key} className="card flex flex-col p-4">
            <div className="flex items-start gap-2">
              <div className="text-xl">{AREA_ICON[r.area]}</div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold leading-tight">{r.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{r.detail}</p>
              </div>
            </div>
            {r.apply && (
              <button className="btn-primary mt-3 self-start !px-3 !py-1.5 text-xs" onClick={() => apply(r)}>
                {applied === r.key ? "Aplicado ✓" : "Aplicar ajuste"}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
