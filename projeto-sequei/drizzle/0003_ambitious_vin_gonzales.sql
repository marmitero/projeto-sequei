CREATE TABLE "community_recipe_likes" (
	"recipe_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"ingredients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"steps" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"kcal" real NOT NULL,
	"protein" real DEFAULT 0 NOT NULL,
	"carbs" real DEFAULT 0 NOT NULL,
	"fat" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "plan_shares_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "target_overrides" jsonb;--> statement-breakpoint
ALTER TABLE "community_recipe_likes" ADD CONSTRAINT "community_recipe_likes_recipe_id_community_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."community_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_recipe_likes" ADD CONSTRAINT "community_recipe_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_recipes" ADD CONSTRAINT "community_recipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_shares" ADD CONSTRAINT "plan_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "community_recipe_likes_unique" ON "community_recipe_likes" USING btree ("recipe_id","user_id");--> statement-breakpoint
CREATE INDEX "community_recipes_user" ON "community_recipes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plan_shares_user" ON "plan_shares" USING btree ("user_id");