import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { metrics } from "@/db/schema";
import { getUser } from "@/lib/session";
import { parseHealthFile } from "@/lib/healthimport";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8_000_000; // exports do Apple Health podem ser grandes

/** POST /api/health-import — multipart: file (export.xml do Apple Health ou CSV de peso). */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Arquivo ausente." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Arquivo muito grande (máx. 8 MB)." }, { status: 413 });

  const content = await file.text();
  const data = parseHealthFile(content);
  const total = data.weights.length + data.bodyFat.length + data.sleep.length;
  if (!total) {
    return Response.json({ error: "Nenhum dado de peso, gordura ou sono encontrado no arquivo." }, { status: 422 });
  }

  // agrupa por data (último valor do dia vence)
  const byDay = new Map<string, { weightKg?: number; bodyFatPct?: number; sleepHours?: number }>();
  const set = (pts: { date: string; value: number }[], key: "weightKg" | "bodyFatPct" | "sleepHours") => {
    for (const p of pts) byDay.set(p.date, { ...byDay.get(p.date), [key]: p.value });
  };
  set(data.weights, "weightKg");
  set(data.bodyFat, "bodyFatPct");
  set(data.sleep, "sleepHours");

  let updated = 0;
  for (const [date, values] of byDay) {
    const existing = await db
      .select({ id: metrics.id })
      .from(metrics)
      .where(and(eq(metrics.userId, user.id), eq(metrics.date, date)))
      .limit(1);
    if (existing.length) {
      await db.update(metrics).set(values).where(eq(metrics.id, existing[0].id));
    } else {
      await db.insert(metrics).values({ userId: user.id, date, ...values });
    }
    updated++;
  }
  return Response.json({
    ok: true,
    days: updated,
    weights: data.weights.length,
    bodyFat: data.bodyFat.length,
    sleep: data.sleep.length,
  });
}
