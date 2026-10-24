import { Profile, ageFrom, bmi, hashSeed, rng } from "./calc";

export type Equip = "none" | "halteres" | "barra" | "maquina" | "polia" | "elastico" | "barra_fixa" | "kettlebell" | "banco";
export type Pattern = "squat" | "hinge" | "lunge" | "push_h" | "push_v" | "pull_h" | "pull_v" | "core" | "glute" | "arms_b" | "arms_t" | "calf" | "lateral";

export type Exercise = {
  id: string;
  name: string;
  muscle: string;
  pattern: Pattern;
  equip: Equip[];
  level: 1 | 2 | 3;
  avoid: string[];
  tip: string;
};

export const EQUIPMENT_LABELS: Record<string, string> = {
  halteres: "Halteres",
  elastico: "Elásticos / mini band",
  barra_fixa: "Barra fixa",
  kettlebell: "Kettlebell",
  banco: "Banco / step",
};

export const INJURY_LABELS: Record<string, string> = {
  joelho: "Joelho",
  lombar: "Lombar / coluna",
  ombro: "Ombro",
  punho: "Punho / cotovelo",
  tornozelo: "Tornozelo",
};

const E = (id: string, name: string, muscle: string, pattern: Pattern, equip: Equip[], level: 1 | 2 | 3, avoid: string[], tip: string): Exercise => ({ id, name, muscle, pattern, equip, level, avoid, tip });

export const EXERCISES: Exercise[] = [
  // Pernas — agachamento
  E("agach_livre", "Agachamento livre (peso corporal)", "Quadríceps e glúteos", "squat", ["none"], 1, [], "Pés na largura dos ombros, desça como se fosse sentar, joelhos alinhados aos pés."),
  E("agach_goblet", "Agachamento goblet", "Quadríceps e glúteos", "squat", ["halteres", "kettlebell"], 1, [], "Segure o peso junto ao peito e mantenha o tronco ereto."),
  E("agach_barra", "Agachamento com barra", "Quadríceps e glúteos", "squat", ["barra"], 2, ["lombar", "joelho"], "Core firme, desça até coxas paralelas ao chão."),
  E("leg_press", "Leg press 45°", "Quadríceps e glúteos", "squat", ["maquina"], 1, [], "Não trave os joelhos no final e mantenha a lombar apoiada."),
  E("cadeira_ext", "Cadeira extensora", "Quadríceps", "squat", ["maquina"], 1, ["joelho"], "Movimento controlado, pausa de 1 s no topo."),
  E("agach_sumo", "Agachamento sumô", "Adutores e glúteos", "squat", ["none", "halteres", "kettlebell"], 1, [], "Pés afastados e apontados para fora."),
  E("wall_sit", "Isometria na parede", "Quadríceps", "squat", ["none"], 1, [], "Joelhos a 90°, costas apoiadas. Bom para iniciantes."),
  // Hinge
  E("terra_romeno", "Levantamento terra romeno", "Posteriores e glúteos", "hinge", ["halteres", "barra", "kettlebell"], 2, ["lombar"], "Quadril para trás, coluna neutra, peso próximo às pernas."),
  E("mesa_flexora", "Mesa / cadeira flexora", "Posteriores de coxa", "hinge", ["maquina"], 1, [], "Controle a descida em 2–3 segundos."),
  E("good_morning_band", "Bom-dia com elástico", "Posteriores e lombar", "hinge", ["elastico"], 1, ["lombar"], "Joelhos levemente flexionados, incline o tronco com a coluna neutra."),
  E("kb_swing", "Kettlebell swing", "Posterior, glúteos e condicionamento", "hinge", ["kettlebell"], 2, ["lombar"], "A força vem do quadril, não dos braços."),
  E("ponte_unilateral", "Ponte unilateral", "Glúteos e posteriores", "hinge", ["none"], 1, [], "Estenda uma perna e suba o quadril com a outra."),
  // Glúteo
  E("elevacao_pelvica", "Elevação pélvica", "Glúteos", "glute", ["none", "halteres", "barra", "banco"], 1, [], "Contraia os glúteos no topo por 1 s."),
  E("abducao_band", "Abdução com mini band", "Glúteo médio", "glute", ["elastico"], 1, [], "Mantenha tensão constante no elástico."),
  E("cadeira_abd", "Cadeira abdutora", "Glúteo médio", "glute", ["maquina"], 1, [], "Leve o tronco à frente para mais ativação."),
  E("coice_polia", "Coice na polia", "Glúteos", "glute", ["polia"], 1, [], "Não arqueie a lombar ao estender o quadril."),
  // Avanço
  E("afundo", "Afundo alternado", "Quadríceps e glúteos", "lunge", ["none", "halteres"], 1, ["joelho"], "Passo amplo, joelho de trás em direção ao chão."),
  E("bulgaro", "Agachamento búlgaro", "Quadríceps e glúteos", "lunge", ["banco", "halteres", "none"], 2, ["joelho", "tornozelo"], "Pé de trás apoiado no banco, tronco levemente inclinado."),
  E("step_up", "Subida no banco (step-up)", "Quadríceps e glúteos", "lunge", ["banco"], 1, ["tornozelo"], "Empurre pelo calcanhar da perna de cima."),
  E("passada_reversa", "Passada reversa", "Glúteos e quadríceps", "lunge", ["none", "halteres"], 1, [], "Passo para trás é mais gentil com o joelho."),
  // Panturrilha
  E("panturrilha_pe", "Elevação de panturrilha em pé", "Panturrilhas", "calf", ["none", "halteres", "maquina"], 1, ["tornozelo"], "Amplitude total, pausa no topo."),
  // Empurrar horizontal
  E("flexao", "Flexão de braço", "Peito e tríceps", "push_h", ["none"], 2, ["punho", "ombro"], "Corpo alinhado como prancha; desça até o peito quase tocar o chão."),
  E("flexao_inclinada", "Flexão inclinada (mãos elevadas)", "Peito e tríceps", "push_h", ["none", "banco"], 1, ["punho"], "Versão mais fácil da flexão — ótima para iniciantes."),
  E("supino_halter", "Supino com halteres", "Peito", "push_h", ["halteres"], 1, ["ombro"], "Cotovelos a ~45° do tronco."),
  E("supino_reto", "Supino reto com barra", "Peito", "push_h", ["barra"], 2, ["ombro"], "Escápulas retraídas e pés firmes no chão."),
  E("supino_maquina", "Supino na máquina", "Peito", "push_h", ["maquina"], 1, [], "Ajuste o banco para a pegada na altura do meio do peito."),
  E("crucifixo_polia", "Crucifixo na polia", "Peito", "push_h", ["polia"], 2, ["ombro"], "Leve flexão dos cotovelos, abrace um tronco imaginário."),
  E("supino_band", "Supino com elástico", "Peito", "push_h", ["elastico"], 1, [], "Elástico preso atrás das costas ou em ponto fixo."),
  // Empurrar vertical
  E("desenv_halter", "Desenvolvimento com halteres", "Ombros", "push_v", ["halteres"], 1, ["ombro"], "Não arqueie a lombar ao empurrar."),
  E("desenv_maquina", "Desenvolvimento na máquina", "Ombros", "push_v", ["maquina"], 1, ["ombro"], "Amplitude confortável."),
  E("pike_pushup", "Flexão pike", "Ombros", "push_v", ["none"], 2, ["ombro", "punho"], "Quadril alto, cabeça desce entre as mãos."),
  E("desenv_band", "Desenvolvimento com elástico", "Ombros", "push_v", ["elastico"], 1, [], "Pise no elástico e empurre acima da cabeça."),
  E("elev_lateral", "Elevação lateral", "Deltoide lateral", "lateral", ["halteres", "elastico", "polia"], 1, [], "Suba até a linha dos ombros, cotovelos levemente flexionados."),
  // Puxar horizontal
  E("remada_halter", "Remada unilateral com halter", "Costas", "pull_h", ["halteres"], 1, [], "Puxe o cotovelo em direção ao quadril."),
  E("remada_band", "Remada com elástico", "Costas", "pull_h", ["elastico"], 1, [], "Junte as escápulas no final."),
  E("remada_baixa", "Remada baixa na polia", "Costas", "pull_h", ["polia", "maquina"], 1, [], "Peito aberto, sem balançar o tronco."),
  E("remada_curvada", "Remada curvada com barra", "Costas", "pull_h", ["barra"], 2, ["lombar"], "Tronco inclinado ~45°, coluna neutra."),
  E("remada_toalha", "Remada invertida na mesa", "Costas", "pull_h", ["none"], 2, ["ombro"], "Deite sob uma mesa firme e puxe o peito em direção à borda."),
  E("superman", "Superman", "Lombar e posterior do ombro", "pull_h", ["none"], 1, ["lombar"], "Eleve braços e pernas simultaneamente, sem exagerar."),
  // Puxar vertical
  E("puxada_frente", "Puxada frontal", "Dorsais", "pull_v", ["polia", "maquina"], 1, [], "Puxe a barra até a parte de cima do peito."),
  E("barra_fixa", "Barra fixa", "Dorsais e bíceps", "pull_v", ["barra_fixa"], 3, ["ombro"], "Use elástico de assistência se necessário."),
  E("barra_negativa", "Barra fixa negativa", "Dorsais", "pull_v", ["barra_fixa"], 2, ["ombro"], "Suba com ajuda e desça em 3–5 segundos."),
  E("pulldown_band", "Puxada com elástico", "Dorsais", "pull_v", ["elastico"], 1, [], "Elástico preso no alto, puxe até o peito."),
  // Braços
  E("rosca_direta", "Rosca direta", "Bíceps", "arms_b", ["halteres", "barra", "elastico", "polia"], 1, ["punho"], "Cotovelos fixos ao lado do corpo."),
  E("rosca_martelo", "Rosca martelo", "Bíceps e antebraço", "arms_b", ["halteres", "kettlebell"], 1, [], "Pegada neutra, palmas viradas para dentro."),
  E("triceps_polia", "Tríceps na polia", "Tríceps", "arms_t", ["polia"], 1, [], "Estenda totalmente sem mexer os ombros."),
  E("triceps_banco", "Tríceps no banco (mergulho)", "Tríceps", "arms_t", ["banco", "none"], 1, ["ombro", "punho"], "Cotovelos apontando para trás."),
  E("triceps_frances", "Tríceps francês", "Tríceps", "arms_t", ["halteres", "elastico"], 1, ["ombro"], "Cotovelos apontados para cima."),
  // Core
  E("prancha", "Prancha", "Core", "core", ["none"], 1, [], "Glúteos e abdômen contraídos, corpo alinhado."),
  E("dead_bug", "Dead bug", "Core profundo", "core", ["none"], 1, [], "Lombar colada ao chão o tempo todo — ideal para quem tem dor lombar."),
  E("bird_dog", "Bird dog", "Core e lombar", "core", ["none"], 1, [], "Estenda braço e perna opostos sem girar o quadril."),
  E("prancha_lateral", "Prancha lateral", "Oblíquos", "core", ["none"], 1, ["ombro"], "Quadril alto, corpo em linha reta."),
  E("abd_infra", "Abdominal infra (elevação de pernas)", "Abdômen inferior", "core", ["none"], 2, ["lombar"], "Controle a descida sem tirar a lombar do chão."),
  E("pallof", "Pallof press", "Core anti-rotação", "core", ["elastico", "polia"], 1, [], "Resista à rotação enquanto estende os braços."),
  E("mountain_climber", "Escalador (mountain climber)", "Core e condicionamento", "core", ["none"], 2, ["punho", "ombro"], "Ritmo constante, quadril baixo."),
];

export const CARDIO: Record<string, { label: string; met: number; impact: "baixo" | "alto"; desc: string }> = {
  caminhada: { label: "Caminhada rápida", met: 4.3, impact: "baixo", desc: "Ritmo em que dá para falar, mas não cantar" },
  corrida: { label: "Corrida leve", met: 8.3, impact: "alto", desc: "Trote confortável (~8–9 km/h)" },
  bike: { label: "Bicicleta / ergométrica", met: 6.8, impact: "baixo", desc: "Intensidade moderada" },
  natacao: { label: "Natação", met: 7.0, impact: "baixo", desc: "Nado contínuo moderado" },
  hiit: { label: "HIIT", met: 8.0, impact: "alto", desc: "30 s forte / 60 s leve" },
  danca: { label: "Dança / aeróbico", met: 5.5, impact: "alto", desc: "Aula ou vídeo de dança" },
  eliptico: { label: "Elíptico (transport)", met: 5.0, impact: "baixo", desc: "Sem impacto nas articulações" },
  remo: { label: "Remo ergômetro", met: 7.0, impact: "baixo", desc: "Puxada com pernas + tronco" },
};

export const ACTIVITY_METS: { key: string; label: string; met: number; kind: string }[] = [
  { key: "musculacao", label: "Musculação (moderada)", met: 5.0, kind: "forca" },
  { key: "musculacao_intensa", label: "Musculação (intensa)", met: 6.0, kind: "forca" },
  { key: "funcional", label: "Treino funcional / circuito", met: 8.0, kind: "forca" },
  ...Object.entries(CARDIO).map(([key, c]) => ({ key, label: c.label, met: c.met, kind: "cardio" })),
  { key: "yoga", label: "Yoga", met: 3.0, kind: "mobilidade" },
  { key: "pilates", label: "Pilates", met: 3.0, kind: "mobilidade" },
  { key: "alongamento", label: "Alongamento / mobilidade", met: 2.3, kind: "mobilidade" },
  { key: "futebol", label: "Futebol", met: 7.0, kind: "esporte" },
  { key: "beach_tennis", label: "Beach tennis / tênis", met: 7.3, kind: "esporte" },
  { key: "lutas", label: "Lutas / muay thai", met: 10.3, kind: "esporte" },
  { key: "volei", label: "Vôlei", met: 4.0, kind: "esporte" },
];

export function kcalFromMet(met: number, weightKg: number, minutes: number) {
  return Math.round(met * weightKg * (minutes / 60));
}

export type PlannedExercise = { id: string; name: string; muscle: string; sets: number; reps: string; rest: string; tip: string };
export type PlannedSession = {
  weekday: number;
  title: string;
  focus: string;
  warmup: string;
  exercises: PlannedExercise[];
  cardio: { key: string; label: string; minutes: number; desc: string } | null;
  minutes: number;
  kcal: number;
};

const SPLITS: Record<string, { title: string; focus: string; patterns: Pattern[] }[]> = {
  full: [
    { title: "Full body A", focus: "Corpo todo — ênfase pernas", patterns: ["squat", "push_h", "pull_v", "glute", "lateral", "core", "arms_b", "calf"] },
    { title: "Full body B", focus: "Corpo todo — ênfase posterior", patterns: ["hinge", "pull_h", "push_v", "lunge", "core", "arms_t", "glute", "calf"] },
    { title: "Full body C", focus: "Corpo todo — equilíbrio", patterns: ["lunge", "push_h", "pull_h", "squat", "core", "lateral", "arms_b", "arms_t"] },
  ],
  upper: [{ title: "Superiores", focus: "Peito, costas, ombros e braços", patterns: ["push_h", "pull_v", "push_v", "pull_h", "lateral", "arms_b", "arms_t", "core"] }],
  lower: [{ title: "Inferiores", focus: "Pernas, glúteos e core", patterns: ["squat", "hinge", "lunge", "glute", "calf", "core", "squat", "glute"] }],
  push: [{ title: "Empurrar", focus: "Peito, ombros e tríceps", patterns: ["push_h", "push_v", "push_h", "lateral", "arms_t", "core", "arms_t", "lateral"] }],
  pull: [{ title: "Puxar", focus: "Costas e bíceps", patterns: ["pull_v", "pull_h", "pull_h", "arms_b", "core", "arms_b", "pull_v", "core"] }],
  legs: [{ title: "Pernas", focus: "Quadríceps, posteriores e glúteos", patterns: ["squat", "hinge", "lunge", "glute", "calf", "squat", "core", "glute"] }],
};

function sessionTemplates(days: number) {
  if (days <= 3) return SPLITS.full.slice(0, Math.max(days, 1));
  if (days === 4) return [SPLITS.upper[0], SPLITS.lower[0], { ...SPLITS.upper[0], title: "Superiores B" }, { ...SPLITS.lower[0], title: "Inferiores B", patterns: ["hinge", "squat", "glute", "lunge", "calf", "core", "hinge", "glute"] as Pattern[] }];
  if (days === 5) return [SPLITS.push[0], SPLITS.pull[0], SPLITS.legs[0], SPLITS.upper[0], SPLITS.lower[0]];
  return [SPLITS.push[0], SPLITS.pull[0], SPLITS.legs[0], { ...SPLITS.push[0], title: "Empurrar B" }, { ...SPLITS.pull[0], title: "Puxar B" }, { ...SPLITS.legs[0], title: "Pernas B" }];
}

const WEEKDAY_SCHEDULES: Record<number, number[]> = {
  1: [3],
  2: [2, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 0],
};

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function availableEquipment(p: Profile): Equip[] {
  if (p.location === "academia") return ["none", "halteres", "barra", "maquina", "polia", "elastico", "barra_fixa", "kettlebell", "banco"];
  return ["none", ...(p.equipment as Equip[])];
}

export function generateWorkoutPlan(p: Profile, variant = 0): PlannedSession[] {
  const days = Math.min(Math.max(p.trainingDays, 1), 7);
  const equip = availableEquipment(p);
  const maxLevel = p.experience === "iniciante" ? 1 : p.experience === "intermediario" ? 2 : 3;
  const age = ageFrom(p.birthDate);
  const imc = bmi(p.weightKg, p.heightCm);
  const pregnant = p.healthConditions.includes("gestante");
  const rand = rng(hashSeed(`${p.name}|${p.birthDate}|${variant}`));

  const params = {
    perder: { sets: 3, reps: "12–15", rest: "45–60 s", cardio: 20 },
    manter: { sets: 3, reps: "10–12", rest: "60–90 s", cardio: 15 },
    ganhar: { sets: 4, reps: "6–10", rest: "90–120 s", cardio: 10 },
    recomp: { sets: 4, reps: "8–12", rest: "60–90 s", cardio: 15 },
  }[p.goal] ?? { sets: 3, reps: "10–12", rest: "60–90 s", cardio: 15 };
  let sets = params.sets;
  if (p.experience === "iniciante") sets = Math.min(sets, 3);
  if (p.experience === "avancado" && p.goal !== "perder") sets += 0;

  // Cardio adequado: evita impacto se lesões, obesidade, idade ou gestação
  const lowImpactOnly = p.injuries.includes("joelho") || p.injuries.includes("tornozelo") || imc >= 30 || age >= 60 || pregnant;
  let cardioOptions = (p.cardioPrefs.length ? p.cardioPrefs : ["caminhada"]).filter((k) => CARDIO[k] && (!lowImpactOnly || CARDIO[k].impact === "baixo"));
  if (!cardioOptions.length) cardioOptions = p.location === "academia" ? ["eliptico", "bike"] : ["caminhada"];
  if (pregnant) cardioOptions = cardioOptions.filter((k) => k !== "hiit");
  if (!cardioOptions.length) cardioOptions = ["caminhada"];

  const cardioMin = Math.min(params.cardio + (imc >= 30 && p.goal === "perder" ? 10 : 0), Math.round(p.sessionMinutes * 0.4));
  const strengthMinutes = Math.max(p.sessionMinutes - 8 - cardioMin, 15);
  const perExercise = sets * (p.goal === "ganhar" ? 2.6 : 2.1);
  const nEx = Math.min(Math.max(Math.floor(strengthMinutes / perExercise), 3), 8);

  const allowed = EXERCISES.filter(
    (e) =>
      e.level <= maxLevel &&
      e.equip.some((q) => equip.includes(q)) &&
      !e.avoid.some((a) => p.injuries.includes(a)) &&
      !(pregnant && ["abd_infra", "mountain_climber", "kb_swing", "superman"].includes(e.id)),
  );

  const templates = sessionTemplates(days);
  const weekdays = WEEKDAY_SCHEDULES[days];
  const met = p.goal === "perder" ? 6.0 : 5.0;

  return weekdays.map((wd, i) => {
    const tpl = templates[i % templates.length];
    const usedIds = new Set<string>();
    const exercises: PlannedExercise[] = [];
    for (const pattern of tpl.patterns) {
      if (exercises.length >= nEx) break;
      const opts = allowed.filter((e) => e.pattern === pattern && !usedIds.has(e.id));
      if (!opts.length) continue;
      // Preferir equipamentos mais específicos (não peso corporal) quando disponíveis
      const weighted = opts.flatMap((e) => (e.equip.includes("none") && opts.length > 1 ? [e] : [e, e]));
      const ex = weighted[Math.floor(rand() * weighted.length)];
      usedIds.add(ex.id);
      const isCore = pattern === "core";
      exercises.push({
        id: ex.id,
        name: ex.name,
        muscle: ex.muscle,
        sets: isCore ? 3 : pattern === "lateral" || pattern.startsWith("arms") || pattern === "calf" ? Math.min(sets, 3) : sets,
        reps: isCore ? (["prancha", "prancha_lateral", "wall_sit"].includes(ex.id) ? "30–45 s" : "10–12") : ex.id === "wall_sit" ? "30–45 s" : params.reps,
        rest: isCore ? "30–45 s" : params.rest,
        tip: ex.tip,
      });
    }
    const ck = cardioOptions[i % cardioOptions.length];
    const cardio = cardioMin > 0 ? { key: ck, label: CARDIO[ck].label, minutes: cardioMin, desc: CARDIO[ck].desc } : null;
    const kcal = kcalFromMet(met, p.weightKg, p.sessionMinutes - cardioMin) + (cardio ? kcalFromMet(CARDIO[ck].met, p.weightKg, cardioMin) : 0);
    return {
      weekday: wd,
      title: tpl.title,
      focus: tpl.focus,
      warmup: p.injuries.length ? "8 min: mobilidade articular suave + aquecimento específico com carga leve, respeitando sua lesão." : "5–8 min: mobilidade articular + 1 série leve do primeiro exercício.",
      exercises,
      cardio,
      minutes: p.sessionMinutes,
      kcal,
    };
  });
}
