import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { progressPhotos } from "@/db/schema";
import { getUser } from "@/lib/session";

export const dynamic = "force-dynamic";

async function ownRow(id: number) {
  const user = await getUser();
  if (!user) return null;
  const rows = await db
    .select()
    .from(progressPhotos)
    .where(and(eq(progressPhotos.id, id), eq(progressPhotos.userId, user.id)))
    .limit(1);
  return rows[0] ?? null;
}

/** GET /api/photos/[id] — bytes da foto. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  const row = Number.isFinite(id) ? await ownRow(id) : null;
  if (!row) return new Response("Não encontrada", { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

/** DELETE /api/photos/[id] */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  const row = Number.isFinite(id) ? await ownRow(id) : null;
  if (!row) return Response.json({ error: "Não encontrada." }, { status: 404 });
  await db.delete(progressPhotos).where(eq(progressPhotos.id, row.id));
  return Response.json({ ok: true });
}
