// Agenda de lembretes (água, treino, pesagem) a partir do perfil — função pura.
export type ReminderKind = "agua" | "treino" | "pesagem";

export type ReminderSlot = {
  kind: ReminderKind;
  /** Minutos desde a meia-noite. */
  atMinutes: number;
  label: string;
  /** Dias da semana (0=domingo). Ausente = todos os dias. */
  days?: number[];
};

export type ReminderInput = {
  wakeTime: string; // "07:00"
  sleepTime: string; // "23:00"
  waterMl: number; // meta diária
  trainingDays?: number; // quantos dias/semana treina (0-7) — 0 desliga o lembrete de treino
  trainingTime?: string; // manha | tarde | noite
  weighDay?: number; // dia da semana da pesagem (default 1 = segunda)
};

const toMin = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? ""));
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h >= 0 && h < 24 && min >= 0 && min < 60 ? h * 60 + min : null;
};

export function buildReminderSchedule(input: ReminderInput): ReminderSlot[] {
  const wake = toMin(input.wakeTime) ?? 7 * 60;
  const sleep = toMin(input.sleepTime) ?? 23 * 60;
  const start = Math.min(wake + 30, sleep - 60);
  const end = Math.max(sleep - 60, start + 60);
  const window = end - start;

  const slots: ReminderSlot[] = [];

  // Água: distribui copos de 250 ml ao longo do dia (3 a 10 lembretes)
  const glasses = Math.min(10, Math.max(3, Math.round(input.waterMl / 250)));
  for (let i = 0; i < glasses; i++) {
    const at = Math.round(start + (window * i) / Math.max(glasses - 1, 1));
    slots.push({ kind: "agua", atMinutes: at, label: "Beba um copo d'água (250 ml) 💧" });
  }

  // Treino: 1 lembrete no período preferido (seg-sex, se treinar ≥3x; todo dia caso contrário)
  const trainingDays = input.trainingDays ?? 0;
  if (trainingDays >= 1) {
    const base = input.trainingTime === "manha" ? wake + 60 : input.trainingTime === "tarde" ? 13 * 60 : 19 * 60;
    const at = Math.min(Math.max(base, wake + 30), Math.max(sleep - 30, wake + 30));
    slots.push({
      kind: "treino",
      atMinutes: at,
      label: "Hora do treino de hoje 💪",
      ...(trainingDays >= 3 ? { days: [1, 2, 3, 4, 5] } : {}),
    });
  }

  // Pesagem: 1x/semana (padrão segunda-feira), de manhã
  slots.push({
    kind: "pesagem",
    atMinutes: wake + 45,
    label: "Hora da pesagem semanal ⚖️",
    days: [input.weighDay ?? 1],
  });

  return slots.sort((a, b) => a.atMinutes - b.atMinutes);
}

/** Próximo horário (em minutos desde meia-noite) que dispara em `date`/`nowMinutes`. */
export function dueSlots(slots: ReminderSlot[], weekday: number, nowMinutes: number, toleranceMin = 1): ReminderSlot[] {
  return slots.filter((s) => (s.days ? s.days.includes(weekday) : true) && Math.abs(s.atMinutes - nowMinutes) <= toleranceMin);
}

export function formatClock(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
