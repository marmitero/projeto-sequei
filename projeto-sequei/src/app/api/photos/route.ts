import { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { progressPhotos } from "@/db/schema";
import { getUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_BYTES = 2_500_000; // 2,5 MB por foto
const OK_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/** GET /api/photos — lista metadados das fotos do usuário. */
export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const rows = await db
    .select({ id: progressPhotos.id, date: progressPhotos.date, label: progressPhotos.label, mime: progressPhotos.mime, createdAt: progressPhotos.createdAt })
    .from(progressPhotos)
    .where(eq(progressPhotos.userId, user.id))
    .orderBy(desc(progressPhotos.date), desc(progressPhotos.createdAt));
  return Response.json({ photos: rows });
}

/** POST /api/photos — multipart: file, date (YYYY-MM-DD), label. */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const date = String(form.get("date") ?? "");
  const label = String(form.get("label") ?? "").slice(0, 80);
  if (!(file instanceof File)) return Response.json({ error: "Arquivo ausente." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "Data inválida." }, { status: 400 });
  const mime = file.type && OK_MIME.has(file.type) ? file.type : "image/jpeg";
  if (file.size > MAX_BYTES) return Response.json({ error: "Foto muito grande (máx. 2,5 MB)." }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const r = await db
    .insert(progressPhotos)
    .values({ userId: user.id, date, label, mime, data: buf })
    .returning({ id: progressPhotos.id });
  return Response.json({ ok: true, id: r[0].id });
}
