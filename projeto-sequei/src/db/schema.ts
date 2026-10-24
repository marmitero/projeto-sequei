import {
  pgTable,
  uuid,
  text,
  real,
  integer,
  timestamp,
  date,
  serial,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/** Conta de acesso (login). 1 conta ↔ 1 perfil (`users`). */
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Sessões ativas (token hasheado — permite logout e revogação). */
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("sessions_account").on(t.accountId)],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    sex: text("sex").notNull(), // M | F
  birthDate: date("birth_date", { mode: "string" }).notNull(),
  heightCm: real("height_cm").notNull(),
  weightKg: real("weight_kg").notNull(),
  targetWeightKg: real("target_weight_kg").notNull(),
  goal: text("goal").notNull(), // perder | manter | ganhar | recomp
  pace: text("pace").notNull().default("moderado"), // leve | moderado | agressivo
  activityLevel: text("activity_level").notNull(), // sedentario | leve | moderado | intenso | atleta
  experience: text("experience").notNull(), // iniciante | intermediario | avancado
  trainingDays: integer("training_days").notNull(),
  sessionMinutes: integer("session_minutes").notNull(),
  location: text("location").notNull(), // academia | casa | ar_livre
  equipment: text("equipment").array().notNull().default([]),
  cardioPrefs: text("cardio_prefs").array().notNull().default([]),
  injuries: text("injuries").array().notNull().default([]),
  diet: text("diet").notNull(), // onivoro | vegetariano | vegano | pescetariano
  carbApproach: text("carb_approach").notNull().default("equilibrado"), // equilibrado | lowcarb | cetogenica
  restrictions: text("restrictions").array().notNull().default([]),
  dislikes: text("dislikes").notNull().default(""),
  healthConditions: text("health_conditions").array().notNull().default([]),
  mealsPerDay: integer("meals_per_day").notNull().default(5),
  wakeTime: text("wake_time").notNull().default("07:00"),
  sleepTime: text("sleep_time").notNull().default("23:00"),
  trainingTime: text("training_time").notNull().default("noite"), // manha | tarde | noite
  climate: text("climate").notNull().default("temperado"),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_account").on(t.accountId)],
);

export const foodLogs = pgTable(
  "food_logs",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    meal: text("meal").notNull(),
    foodKey: text("food_key"),
    recipeKey: text("recipe_key"),
    name: text("name").notNull(),
    grams: real("grams").notNull(),
    portionLabel: text("portion_label").notNull().default(""),
    kcal: real("kcal").notNull(),
    protein: real("protein").notNull(),
    carbs: real("carbs").notNull(),
    fat: real("fat").notNull(),
    fiber: real("fiber").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("food_logs_user_date").on(t.userId, t.date)],
);

export const waterLogs = pgTable(
  "water_logs",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    ml: integer("ml").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("water_logs_user_date").on(t.userId, t.date)],
);

export type WorkoutExercise = {
  name: string;
  sets: number;
  reps: string;
  load?: string;
  done?: boolean;
};

export const workoutLogs = pgTable(
  "workout_logs",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    title: text("title").notNull(),
    kind: text("kind").notNull(), // forca | cardio | mobilidade | esporte
    durationMin: integer("duration_min").notNull(),
    kcal: real("kcal").notNull(),
    effort: integer("effort").notNull().default(6),
    exercises: jsonb("exercises").$type<WorkoutExercise[]>().notNull().default([]),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("workout_logs_user_date").on(t.userId, t.date)],
);

export const metrics = pgTable(
  "metrics",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    weightKg: real("weight_kg"),
    bodyFatPct: real("body_fat_pct"),
    waistCm: real("waist_cm"),
    hipCm: real("hip_cm"),
    neckCm: real("neck_cm"),
    chestCm: real("chest_cm"),
    armCm: real("arm_cm"),
    thighCm: real("thigh_cm"),
    restingHr: integer("resting_hr"),
    sleepHours: real("sleep_hours"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("metrics_user_date").on(t.userId, t.date)],
);

export type Account = typeof accounts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type User = typeof users.$inferSelect;
export type FoodLog = typeof foodLogs.$inferSelect;
export type WaterLog = typeof waterLogs.$inferSelect;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type Metric = typeof metrics.$inferSelect;
