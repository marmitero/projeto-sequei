// Cálculos personalizados — todos dependem exclusivamente do perfil do usuário.

export type Profile = {
  name: string;
  sex: string;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  goal: string;
  pace: string;
  activityLevel: string;
  experience: string;
  trainingDays: number;
  sessionMinutes: number;
  location: string;
  equipment: string[];
  cardioPrefs: string[];
  injuries: string[];
  diet: string;
  carbApproach: string;
  restrictions: string[];
  dislikes: string;
  healthConditions: string[];
  mealsPerDay: number;
  wakeTime: string;
  sleepTime: string;
  trainingTime: string;
  climate: string;
  timezone: string;
};

// label/desc são chaves i18n (traduzir com t()).
export const ACTIVITY_FACTORS: Record<string, { f: number; label: string; desc: string }> = {
  sedentario: { f: 1.2, label: "act.sedentario", desc: "actDesc.sedentario" },
  leve: { f: 1.375, label: "act.leve", desc: "actDesc.leve" },
  moderado: { f: 1.55, label: "act.moderado", desc: "actDesc.moderado" },
  intenso: { f: 1.725, label: "act.intenso", desc: "actDesc.intenso" },
  atleta: { f: 1.9, label: "act.atleta", desc: "actDesc.atleta" },
};

// label/desc são chaves i18n (traduzir com t()).
export const GOALS: Record<string, { label: string; desc: string }> = {
  perder: { label: "goal.perder", desc: "goalDesc.perder" },
  manter: { label: "goal.manter", desc: "goalDesc.manter" },
  ganhar: { label: "goal.ganhar", desc: "goalDesc.ganhar" },
  recomp: { label: "goal.recomp", desc: "goalDesc.recomp" },
};

export function ageFrom(birthDate: string) {
  const b = new Date(birthDate + "T12:00:00");
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return Math.max(age, 0);
}

export function bmr(p: Pick<Profile, "sex" | "weightKg" | "heightCm" | "birthDate">) {
  const age = ageFrom(p.birthDate);
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * age + (p.sex === "M" ? 5 : -161);
}

export function bmi(weightKg: number, heightCm: number) {
  const h = heightCm / 100;
  return weightKg / (h * h);
}

export function bmiClass(v: number) {
  if (v < 18.5) return { label: "bmi.under", color: "text-sky-600" };
  if (v < 25) return { label: "bmi.normal", color: "text-emerald-600" };
  if (v < 30) return { label: "bmi.over", color: "text-amber-600" };
  if (v < 35) return { label: "bmi.ob1", color: "text-orange-600" };
  if (v < 40) return { label: "bmi.ob2", color: "text-rose-600" };
  return { label: "bmi.ob3", color: "text-rose-700" };
}

/** % de gordura pelo método da Marinha dos EUA (medidas em cm). */
export function navyBodyFat(sex: string, heightCm: number, waist?: number | null, neck?: number | null, hip?: number | null) {
  if (!waist || !neck) return null;
  if (sex === "M") {
    if (waist - neck <= 0) return null;
    return 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(heightCm)) - 450;
  }
  if (!hip || waist + hip - neck <= 0) return null;
  return 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(heightCm)) - 450;
}

/** Overrides parciais de metas (ajuste inteligente/manual). */
export type TargetOverrides = {
  kcal?: number;
  water?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
};

export type Targets = {
  bmr: number;
  tdee: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
  waterTrainingExtra: number;
  deltaKcal: number;
  weeklyChangeKg: number;
  proteinPerKg: number;
  notes: NoteMsg[];
};

/** Mensagem de nota com chave i18n. */
export type NoteMsg = { key: string; vars?: Record<string, string | number> };

export function computeTargets(p: Profile): Targets {
  const age = ageFrom(p.birthDate);
  const base = bmr(p);
  const factor = ACTIVITY_FACTORS[p.activityLevel]?.f ?? 1.375;
  const tdee = base * factor;
  const conditions = p.healthConditions;
  const notes: NoteMsg[] = [];

  // Ajuste calórico por objetivo e ritmo
  const paceMap: Record<string, number> = { leve: 0.1, moderado: 0.18, agressivo: 0.25 };
  const pct = paceMap[p.pace] ?? 0.18;
  let delta = 0;
  if (p.goal === "perder") delta = -tdee * pct;
  else if (p.goal === "ganhar") delta = tdee * (pct * 0.6);
  else if (p.goal === "recomp") delta = -tdee * 0.08;

  if (conditions.includes("gestante")) {
    delta = Math.max(delta, 0) + 300;
    notes.push({ key: "note.gestante" });
  }
  if (conditions.includes("lactante")) {
    delta = Math.max(delta, 0) + 450;
    notes.push({ key: "note.lactante" });
  }

  let kcal = tdee + delta;
  const floor = p.sex === "M" ? 1500 : 1200;
  if (kcal < floor) {
    kcal = floor;
    notes.push({ key: "note.floor", vars: { floor } });
  }
  if (kcal < base) notes.push({ key: "note.nearBmr", vars: { b: Math.round(base) } });

  // Proteína (g/kg) — ISSN: 1.4–2.0 g/kg para quem treina
  let protPerKg = { perder: 2.0, manter: 1.6, ganhar: 1.8, recomp: 2.1 }[p.goal] ?? 1.6;
  if (p.experience === "iniciante" && p.trainingDays <= 2) protPerKg -= 0.2;
  if (age >= 60) protPerKg = Math.max(protPerKg, 1.3);
  // Para pessoas com obesidade, usa peso ajustado
  const imc = bmi(p.weightKg, p.heightCm);
  const idealW = 24.9 * (p.heightCm / 100) ** 2;
  const refWeight = imc > 30 ? idealW + 0.25 * (p.weightKg - idealW) : p.weightKg;
  if (conditions.includes("renal")) {
    protPerKg = 0.8;
    notes.push({ key: "note.renalProtein", vars: { v: 0.8 } });
  }
  const protein = Math.round(refWeight * protPerKg);

  // Gordura e carboidrato conforme abordagem
  let fat: number;
  let carbs: number;
  if (p.carbApproach === "cetogenica") {
    carbs = 30;
    fat = Math.round((kcal - protein * 4 - carbs * 4) / 9);
  } else if (p.carbApproach === "lowcarb") {
    carbs = Math.round(Math.min((kcal * 0.2) / 4, 130));
    fat = Math.round((kcal - protein * 4 - carbs * 4) / 9);
  } else {
    fat = Math.round(Math.max((kcal * 0.27) / 9, p.weightKg * 0.7));
    carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
    if (conditions.includes("diabetes")) {
      carbs = Math.min(carbs, Math.round((kcal * 0.4) / 4));
      fat = Math.round((kcal - protein * 4 - carbs * 4) / 9);
      notes.push({ key: "note.diabetes" });
    }
  }
  if (carbs < 20) carbs = 20;

  const fiber = Math.round((kcal / 1000) * 14);

  // Água: 35 ml/kg (30 ml/kg acima de 55 anos) + clima + condições
  let water = p.weightKg * (age > 55 ? 30 : 35);
  if (p.climate === "quente") water += 500;
  if (p.activityLevel === "intenso" || p.activityLevel === "atleta") water += 300;
  if (conditions.includes("gestante")) water += 300;
  if (conditions.includes("lactante")) water += 700;
  if (conditions.includes("renal")) notes.push({ key: "note.renalWater" });
  if (conditions.includes("hipertensao")) notes.push({ key: "note.hipertensao" });
  if (conditions.includes("colesterol")) notes.push({ key: "note.colesterol" });
  water = Math.round(water / 50) * 50;
  const waterTrainingExtra = Math.round(((p.sessionMinutes / 60) * 500) / 50) * 50;

  const deltaKcal = Math.round(kcal - tdee);
  const weeklyChangeKg = +((deltaKcal * 7) / 7700).toFixed(2);

  return {
    bmr: Math.round(base),
    tdee: Math.round(tdee),
    kcal: Math.round(kcal),
    protein,
    carbs,
    fat,
    fiber,
    water,
    waterTrainingExtra,
    deltaKcal,
    weeklyChangeKg,
    proteinPerKg: +(protein / p.weightKg).toFixed(2),
    notes,
  };
}

export function weeksToGoal(p: Profile, t: Targets) {
  const diff = p.targetWeightKg - p.weightKg;
  if (Math.abs(diff) < 0.5 || t.weeklyChangeKg === 0) return null;
  if (Math.sign(diff) !== Math.sign(t.weeklyChangeKg)) return null;
  return Math.ceil(Math.abs(diff / t.weeklyChangeKg));
}

export function todayIn(tz: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  }
}

export function addDays(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date: string) {
  return new Date(date + "T12:00:00Z").getUTCDay(); // 0 = domingo
}

export const LOCALE_TAGS: Record<string, string> = { pt: "pt-BR", en: "en-US", fr: "fr-FR", es: "es-ES", zh: "zh-CN" };

export function formatDateBR(date: string, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }, locale: string = "pt") {
  return new Date(date + "T12:00:00Z").toLocaleDateString(LOCALE_TAGS[locale] ?? "pt-BR", { ...opts, timeZone: "UTC" });
}

export function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// label é chave i18n (traduzir com t()).
export const MEALS: Record<string, { label: string; emoji: string }> = {
  cafe: { label: "meal.cafe", emoji: "☕" },
  lanche_manha: { label: "meal.lancheManha", emoji: "🍎" },
  almoco: { label: "meal.almoco", emoji: "🍽️" },
  lanche_tarde: { label: "meal.lancheTarde", emoji: "🥤" },
  jantar: { label: "meal.jantar", emoji: "🌙" },
  ceia: { label: "meal.ceia", emoji: "🫖" },
};

export function mealsFor(n: number): string[] {
  if (n <= 3) return ["cafe", "almoco", "jantar"];
  if (n === 4) return ["cafe", "almoco", "lanche_tarde", "jantar"];
  if (n === 5) return ["cafe", "lanche_manha", "almoco", "lanche_tarde", "jantar"];
  return ["cafe", "lanche_manha", "almoco", "lanche_tarde", "jantar", "ceia"];
}

export function personalTips(p: Profile, t: Targets): NoteMsg[] {
  const tips: NoteMsg[] = [];
  const age = ageFrom(p.birthDate);
  const n1 = (x: number) => String(x).replace(".", ",");
  if (p.goal === "perder") tips.push({ key: "tip.deficit", vars: { kcal: Math.abs(t.deltaKcal), kg: n1(Math.abs(t.weeklyChangeKg)) } });
  if (p.goal === "ganhar") tips.push({ key: "tip.surplus", vars: { kcal: t.deltaKcal, kg: n1(t.weeklyChangeKg) } });
  if (p.goal === "recomp") tips.push({ key: "tip.recomp" });
  tips.push({ key: "tip.protein", vars: { perMeal: Math.round(t.protein / Math.max(p.mealsPerDay, 3)), meals: p.mealsPerDay } });
  if (p.healthConditions.includes("diabetes")) tips.push({ key: "tip.diabetes" });
  if (p.healthConditions.includes("hipotireoidismo")) tips.push({ key: "tip.thyroid" });
  if (age >= 60) tips.push({ key: "tip.senior" });
  if (p.injuries.length) tips.push({ key: "tip.injuries" });
  if (p.carbApproach !== "equilibrado") tips.push({ key: "tip.lowcarb" });
  if (p.trainingTime === "manha") tips.push({ key: "tip.morning" });
  if (p.trainingTime === "noite") tips.push({ key: "tip.night" });
  return tips;
}
