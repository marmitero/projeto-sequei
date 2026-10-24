CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "food_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"meal" text NOT NULL,
	"food_key" text,
	"recipe_key" text,
	"name" text NOT NULL,
	"grams" real NOT NULL,
	"portion_label" text DEFAULT '' NOT NULL,
	"kcal" real NOT NULL,
	"protein" real NOT NULL,
	"carbs" real NOT NULL,
	"fat" real NOT NULL,
	"fiber" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"weight_kg" real,
	"body_fat_pct" real,
	"waist_cm" real,
	"hip_cm" real,
	"neck_cm" real,
	"chest_cm" real,
	"arm_cm" real,
	"thigh_cm" real,
	"resting_hr" integer,
	"sleep_hours" real,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid,
	"name" text NOT NULL,
	"sex" text NOT NULL,
	"birth_date" date NOT NULL,
	"height_cm" real NOT NULL,
	"weight_kg" real NOT NULL,
	"target_weight_kg" real NOT NULL,
	"goal" text NOT NULL,
	"pace" text DEFAULT 'moderado' NOT NULL,
	"activity_level" text NOT NULL,
	"experience" text NOT NULL,
	"training_days" integer NOT NULL,
	"session_minutes" integer NOT NULL,
	"location" text NOT NULL,
	"equipment" text[] DEFAULT '{}' NOT NULL,
	"cardio_prefs" text[] DEFAULT '{}' NOT NULL,
	"injuries" text[] DEFAULT '{}' NOT NULL,
	"diet" text NOT NULL,
	"carb_approach" text DEFAULT 'equilibrado' NOT NULL,
	"restrictions" text[] DEFAULT '{}' NOT NULL,
	"dislikes" text DEFAULT '' NOT NULL,
	"health_conditions" text[] DEFAULT '{}' NOT NULL,
	"meals_per_day" integer DEFAULT 5 NOT NULL,
	"wake_time" text DEFAULT '07:00' NOT NULL,
	"sleep_time" text DEFAULT '23:00' NOT NULL,
	"training_time" text DEFAULT 'noite' NOT NULL,
	"climate" text DEFAULT 'temperado' NOT NULL,
	"timezone" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "water_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"ml" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"duration_min" integer NOT NULL,
	"kcal" real NOT NULL,
	"effort" integer DEFAULT 6 NOT NULL,
	"exercises" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_logs" ADD CONSTRAINT "water_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "food_logs_user_date" ON "food_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "metrics_user_date" ON "metrics" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "sessions_account" ON "sessions" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_account" ON "users" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "water_logs_user_date" ON "water_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "workout_logs_user_date" ON "workout_logs" USING btree ("user_id","date");