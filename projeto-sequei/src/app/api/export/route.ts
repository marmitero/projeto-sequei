import { eq } from "drizzle-orm";
import { db } from "@/db";
import { foodLogs, waterLogs, workoutLogs, metrics } from "@/db/schema";
import { getUser, toProfile, getSessionAccount } from "@/lib/session";

export const dynamic = "force-dynamic";

function csv(rows: (string | number)[][]) {
  return rows
    .map((r) => r.map((c) => (typeof c === "number" ? String(c) : `"${String(c ?? "").replace(/"/g, '""')}"`)).join(","))
    .join("\n");
}

function attachment(name: string, type: string, body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": `${type}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "json";
  const type = url.searchParams.get("type") ?? "all";
  const day = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    const [foods, waters, workouts, ms, account] = await Promise.all([
      db.select().from(foodLogs).where(eq(foodLogs.userId, user.id)),
      db.select().from(waterLogs).where(eq(waterLogs.userId, user.id)),
      db.select().from(workoutLogs).where(eq(workoutLogs.userId, user.id)),
      db.select().from(metrics).where(eq(metrics.userId, user.id)),
      getSessionAccount(),
    ]);
    const strip = <T extends { userId: string; createdAt: Date }>(r: T) => {
      const { userId: _u, createdAt: _c, ...rest } = r;
      return rest;
    };
    const body = JSON.stringify(
      {
        app: "fitvida",
        version: 1,
        exportedAt: new Date().toISOString(),
        email: account?.email ?? null,
        profile: toProfile(user),
        foodLogs: foods.map(strip),
        waterLogs: waters.map(strip),
        workoutLogs: workouts.map(strip),
        metrics: ms.map(strip),
      },
      null,
      2,
    );
    return attachment(`fitvida-backup-${day}.json`, "application/json", body);
  }

  if (format !== "csv") return Response.json({ error: "format deve ser json ou csv" }, { status: 400 });

  if (type === "foods") {
    const rows = await db.select().from(foodLogs).where(eq(foodLogs.userId, user.id));
    return attachment(
      `fitvida-alimentacao-${day}.csv`,
      "text/csv",
      csv([
        ["date", "meal", "name", "grams", "portion", "kcal", "protein", "carbs", "fat", "fiber"],
        ...rows.map((r) => [r.date, r.meal, r.name, r.grams, r.portionLabel, r.kcal, r.protein, r.carbs, r.fat, r.fiber]),
      ]),
    );
  }
  if (type === "water") {
    const rows = await db.select().from(waterLogs).where(eq(waterLogs.userId, user.id));
    return attachment(`fitvida-agua-${day}.csv`, "text/csv", csv([["date", "ml"], ...rows.map((r) => [r.date, r.ml])]));
  }
  if (type === "workouts") {
    const rows = await db.select().from(workoutLogs).where(eq(workoutLogs.userId, user.id));
    return attachment(
      `fitvida-treinos-${day}.csv`,
      "text/csv",
      csv([
        ["date", "title", "kind", "duration_min", "kcal", "effort", "notes"],
        ...rows.map((r) => [r.date, r.title, r.kind, r.durationMin, r.kcal, r.effort, r.notes]),
      ]),
    );
  }
  if (type === "metrics") {
    const rows = await db.select().from(metrics).where(eq(metrics.userId, user.id));
    return attachment(
      `fitvida-metricas-${day}.csv`,
      "text/csv",
      csv([
        ["date", "weight_kg", "body_fat_pct", "waist_cm", "hip_cm", "neck_cm", "chest_cm", "arm_cm", "thigh_cm", "resting_hr", "sleep_hours", "notes"],
        ...rows.map((r) => [r.date, r.weightKg ?? "", r.bodyFatPct ?? "", r.waistCm ?? "", r.hipCm ?? "", r.neckCm ?? "", r.chestCm ?? "", r.armCm ?? "", r.thighCm ?? "", r.restingHr ?? "", r.sleepHours ?? "", r.notes]),
      ]),
    );
  }
  if (type === "profile") {
    return attachment(
      `fitvida-perfil-${day}.csv`,
      "text/csv",
      csv([
        ["field", "value"],
        ...Object.entries(toProfile(user)).map(([k, v]) => [k, Array.isArray(v) ? v.join("; ") : String(v)]),
      ]),
    );
  }
  return Response.json({ error: "type deve ser profile|foods|water|workouts|metrics" }, { status: 400 });
}
