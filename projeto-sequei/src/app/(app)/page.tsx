import Link from "next/link";
import { Flame, Droplets, Dumbbell, Scale, ChevronRight, Lightbulb, Utensils, ChefHat, Target, Footprints } from "lucide-react";
import { getContext, foodsOn, waterBetween, workoutsBetween, allMetrics, sumMacros, dailyCounts } from "@/lib/data";
import { summarize } from "@/lib/gamification";
import GamificationPanel from "@/components/GamificationPanel";
import { addDays, GOALS, personalTips, weekdayOf, bmi, bmiClass, formatDateBR, weeksToGoal } from "@/lib/calc";
import { generateWorkoutPlan, WEEKDAYS } from "@/lib/exercises";
import { RECIPES, recipeNutrition, recipeCompatibility } from "@/lib/recipes";
import { Ring, MacroRow, Stat, LineChart, MacroPills, fmt } from "@/components/ui";

export default async function Dashboard() {
  const { user, profile, targets, today } = await getContext();
  const weekAgo = addDays(today, -6);
  const [foods, water, workouts, ms] = await Promise.all([
    foodsOn(user.id, today),
    waterBetween(user.id, today, today),
    workoutsBetween(user.id, weekAgo, today),
    allMetrics(user.id),
  ]);

  const counts = await dailyCounts(user.id, targets.water);
  const game = summarize(counts, today);
  const eaten = sumMacros(foods);
  const waterMl = water.reduce((a, w) => a + w.ml, 0);
  const todayWorkouts = workouts.filter((w) => w.date === today);
  const burned = todayWorkouts.reduce((a, w) => a + w.kcal, 0);
  const plan = generateWorkoutPlan(profile);
  const wd = weekdayOf(today);
  const session = plan.find((s) => s.weekday === wd);
  const nextSession = session ?? plan.find((s) => s.weekday > wd) ?? plan[0];
  const waterGoal = targets.water + (session ? targets.waterTrainingExtra : 0);
  const remaining = targets.kcal - eaten.kcal + burned;
  const weekCount = workouts.length;

  const weights = ms.filter((m) => m.weightKg).map((m) => ({ x: formatDateBR(m.date), y: m.weightKg as number }));
  const imc = bmi(profile.weightKg, profile.heightCm);
  const weeks = weeksToGoal(profile, targets);
  const startW = ms.find((m) => m.weightKg)?.weightKg ?? profile.weightKg;

  // Receita do dia que mais se encaixa no restante de macros
  const remP = Math.max(targets.protein - eaten.protein, 0);
  const remC = Math.max(targets.carbs - eaten.carbs, 0);
  const compatible = RECIPES.filter((r) => recipeCompatibility(r, profile.diet, profile.restrictions, profile.dislikes).ok)
    .map((r) => {
      const n = recipeNutrition(r);
      const score = Math.abs(n.protein - remP * 0.35) + Math.abs(n.carbs - remC * 0.3) * 0.7 + (n.kcal > Math.max(remaining, 150) ? 50 : 0);
      return { r, n, score };
    })
    .sort((a, b) => a.score - b.score);
  const pickIdx = compatible.length ? new Date(today).getUTCDate() % Math.min(3, compatible.length) : 0;
  const recipe = compatible[pickIdx];

  const tips = personalTips(profile, targets);
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: user.timezone }).format(new Date()));
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{formatDateBR(today, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {greet}, {user.name.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-slate-500">
          Objetivo: <b className="text-slate-700">{GOALS[profile.goal]?.label}</b> · {profile.weightKg} kg → {profile.targetWeightKg} kg
          {weeks ? ` · previsão de ~${weeks} semanas` : ""}
        </p>
      </div>

      {/* Hero de calorias */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 sm:p-6 lg:col-span-2">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <Ring value={eaten.kcal} max={targets.kcal + burned} size={168} stroke={16}>
              <div>
                <div className="text-3xl font-bold tabular-nums">{fmt(Math.abs(remaining))}</div>
                <div className="text-xs text-slate-500">{remaining >= 0 ? "kcal restantes" : "kcal acima"}</div>
              </div>
            </Ring>
            <div className="w-full flex-1 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-slate-50 p-2.5">
                  <div className="text-[11px] uppercase text-slate-500">Meta</div>
                  <div className="font-bold tabular-nums">{fmt(targets.kcal)}</div>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-2.5">
                  <div className="text-[11px] uppercase text-emerald-700 dark:text-emerald-300">Consumido</div>
                  <div className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{fmt(eaten.kcal)}</div>
                </div>
                <div className="rounded-2xl bg-orange-50 p-2.5">
                  <div className="text-[11px] uppercase text-orange-700">Treino</div>
                  <div className="font-bold tabular-nums text-orange-700">+{fmt(burned)}</div>
                </div>
              </div>
              <MacroRow k="protein" value={eaten.protein} target={targets.protein} />
              <MacroRow k="carbs" value={eaten.carbs} target={targets.carbs} />
              <MacroRow k="fat" value={eaten.fat} target={targets.fat} />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/alimentacao" className="btn-primary">
              <Utensils size={16} /> Registrar refeição
            </Link>
            <Link href="/alimentacao#plano" className="btn-outline">
              Ver cardápio sugerido
            </Link>
          </div>
        </div>

        {/* Água */}
        <Link href="/hidratacao" className="card group flex flex-col justify-between bg-gradient-to-br from-cyan-500 to-sky-600 p-5 text-white sm:p-6">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold">
              <Droplets size={18} /> Hidratação
            </span>
            <ChevronRight size={18} className="transition group-hover:translate-x-1" />
          </div>
          <div className="my-4 flex items-center gap-4">
            <Ring value={waterMl} max={waterGoal} size={110} stroke={11} color="#ffffff" track="rgba(255,255,255,.25)">
              <span className="text-lg font-bold">{Math.round((waterMl / waterGoal) * 100)}%</span>
            </Ring>
            <div>
              <div className="text-3xl font-bold tabular-nums">{(waterMl / 1000).toFixed(2).replace(".", ",")} L</div>
              <div className="text-sm text-cyan-100">de {(waterGoal / 1000).toFixed(2).replace(".", ",")} L</div>
              {session && <div className="mt-1 text-xs text-cyan-100">inclui +{targets.waterTrainingExtra} ml do treino</div>}
            </div>
          </div>
          <div className="text-sm text-cyan-50">Faltam {fmt(Math.max(waterGoal - waterMl, 0))} ml — toque para registrar</div>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Peso atual" value={`${fmt(profile.weightKg, 1)} kg`} sub={`${startW - profile.weightKg >= 0 ? "-" : "+"}${fmt(Math.abs(startW - profile.weightKg), 1)} kg desde o início`} icon={<Scale size={16} />} tone="violet" />
        <Stat label="IMC" value={fmt(imc, 1)} sub={<span className={bmiClass(imc).color}>{bmiClass(imc).label}</span>} icon={<Target size={16} />} tone="sky" />
        <Stat label="Treinos (7 dias)" value={`${weekCount}/${profile.trainingDays}`} sub="meta semanal" icon={<Dumbbell size={16} />} tone="amber" />
        <Stat label="Proteína" value={`${Math.round((eaten.protein / targets.protein) * 100)}%`} sub={`${fmt(eaten.protein)} de ${targets.protein} g`} icon={<Flame size={16} />} tone="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Treino de hoje */}
        <div className="card p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              <Dumbbell size={18} className="text-orange-500" /> {session ? "Treino de hoje" : "Hoje é dia de descanso"}
            </h2>
            <Link href="/exercicios" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Ver plano
            </Link>
          </div>
          {todayWorkouts.length > 0 && (
            <div className="mb-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:text-emerald-300">
              ✅ Você já registrou {todayWorkouts.map((w) => w.title).join(", ")} hoje ({fmt(burned)} kcal).
            </div>
          )}
          {nextSession && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{session ? WEEKDAYS[wd] : `Próximo: ${WEEKDAYS[nextSession.weekday]}`}</div>
              <div className="text-lg font-bold">{nextSession.title}</div>
              <div className="text-sm text-slate-500">{nextSession.focus}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {nextSession.exercises.slice(0, 5).map((e) => (
                  <span key={e.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {e.name}
                  </span>
                ))}
                {nextSession.exercises.length > 5 && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">+{nextSession.exercises.length - 5}</span>}
              </div>
              <div className="mt-3 flex gap-4 text-xs text-slate-500">
                <span>⏱ {nextSession.minutes} min</span>
                <span>🔥 ~{nextSession.kcal} kcal</span>
                {nextSession.cardio && (
                  <span className="flex items-center gap-1">
                    <Footprints size={12} /> {nextSession.cardio.label} {nextSession.cardio.minutes}′
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Peso */}
        <div className="card p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              <Scale size={18} className="text-violet-500" /> Evolução do peso
            </h2>
            <Link href="/metricas" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Registrar
            </Link>
          </div>
          {weights.length ? (
            <LineChart data={weights.slice(-14)} color="#8b5cf6" target={profile.targetWeightKg} unit=" kg" />
          ) : (
            <div className="grid h-40 place-items-center rounded-2xl bg-slate-50 text-center text-sm text-slate-500">
              Registre seu peso em Métricas para acompanhar a evolução.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {recipe && (
          <Link href={`/receitas?r=${recipe.r.key}`} className="card group overflow-hidden lg:col-span-2">
            <div className={`flex h-28 items-center justify-center bg-gradient-to-br ${recipe.r.gradient} text-6xl`}>{recipe.r.emoji}</div>
            <div className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                <ChefHat size={14} /> Receita low-carb pra você hoje
              </div>
              <div className="mt-1 font-bold group-hover:text-emerald-700 dark:text-emerald-300">{recipe.r.name}</div>
              <div className="mt-2">
                <MacroPills kcal={recipe.n.kcal} p={recipe.n.protein} c={recipe.n.carbs} f={recipe.n.fat} />
              </div>
              <p className="mt-2 text-xs text-slate-500">Escolhida pelo que ainda falta nos seus macros de hoje e pelas suas restrições.</p>
            </div>
          </Link>
        )}
        <div className="card p-5 sm:p-6 lg:col-span-3">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <Lightbulb size={18} className="text-amber-500" /> Recomendações para você
          </h2>
          <ul className="space-y-2.5">
            {[...targets.notes, ...tips].slice(0, 7).map((t) => (
              <li key={t} className="flex gap-2.5 text-sm text-slate-600">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <GamificationPanel streaks={game.streaks} badges={game.badges} earned={game.earned} />

    </div>
  );
}
