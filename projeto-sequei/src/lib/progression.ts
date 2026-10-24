// Progressão de força a partir do histórico de treinos — funções puras.
export type LoadPoint = { date: string; loadKg: number | null; sets: number; reps: string; effort: number };

export type Progression = {
  exercise: string;
  series: LoadPoint[];
  suggestion: { action: "increase" | "maintain" | "deload" | "none"; nextKg: number | null; text: string };
};

/** Extrai o peso em kg de uma string de carga ("20", "20 kg", "20,5kg", "12.5 lbs"?→não). */
export function parseLoadKg(load?: string | null): number | null {
  if (!load) return null;
  const m = String(load).replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 && n <= 600 ? n : null;
}

/**
 * Monta a série de um exercício e sugere o próximo passo.
 * Heurística simples e documentada:
 * - < 2 sessões registradas → sem sugestão;
 * - últimas 2 sessões com mesma carga e esforço médio ≤ 8 → +5% (min +0,5 kg, arredondado em 0,5);
 * - esforço médio ≥ 9 → manter carga;
 * - carga caindo nas últimas sessões → deload (−10%, arredondado em 0,5).
 */
export function progressionFor(
  logs: { date: string; effort: number; exercises: { name: string; sets: number; reps: string; load?: string }[] }[],
  exerciseName: string,
): Progression {
  const series: LoadPoint[] = [];
  for (const log of [...logs].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const e of log.exercises) {
      if (e.name === exerciseName) {
        series.push({ date: log.date, loadKg: parseLoadKg(e.load), sets: e.sets, reps: e.reps, effort: log.effort });
      }
    }
  }

  const suggestion = ((): Progression["suggestion"] => {
    if (series.length < 2) {
      return { action: "none", nextKg: null, text: "Registre este exercício em pelo menos 2 sessões para receber sugestão de carga." };
    }
    const last = series.slice(-2);
    const avgEffort = series.slice(-2).reduce((a, p) => a + p.effort, 0) / 2;
    const loads = last.map((p) => p.loadKg);
    const falling = series.length >= 3 && (series[series.length - 1].loadKg ?? 0) < (series[series.length - 3].loadKg ?? 0);

    if (falling) {
      const base = series[series.length - 1].loadKg;
      const next = base === null ? null : roundHalf(Math.max(base * 0.9, 0));
      return { action: "deload", nextKg: next, text: `Carga caindo nas últimas sessões — considere aliviar${next !== null ? ` para ~${fmtKg(next)} kg` : ""} e reconstruir.` };
    }
    if (avgEffort >= 9) {
      return { action: "maintain", nextKg: loads[1], text: "Esforço muito alto (≥ 9) — mantenha a carga e refine a técnica antes de progredir." };
    }
    if (loads[0] !== null && loads[0] === loads[1]) {
      const next = roundHalf(Math.max(loads[1]! * 1.05, loads[1]! + 0.5));
      return { action: "increase", nextKg: next, text: `Duas sessões na mesma carga com esforço controlado — tente ${fmtKg(next)} kg (+5%) na próxima.` };
    }
    return { action: "maintain", nextKg: loads[1], text: "Continue progredindo no seu ritmo — registre a carga em todas as séries principais." };
  })();

  return { exercise: exerciseName, series, suggestion };
}

function roundHalf(n: number) {
  return Math.round(n * 2) / 2;
}
function fmtKg(n: number) {
  return n.toFixed(1).replace(".", ",").replace(",0", "");
}
