import { eq } from "drizzle-orm";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { removeFile, toPhotoDTO } from "@/lib/files";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const photoId = Number(id);
  if (!Number.isFinite(photoId)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const [row] = await db.select().from(photos).where(eq(photos.id, photoId)).limit(1);
  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ photo: toPhotoDTO(row) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const photoId = Number(id);
  if (!Number.isFinite(photoId)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const [row] = await db.select().from(photos).where(eq(photos.id, photoId)).limit(1);
  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await Promise.all([
    removeFile("original", row.originalFile),
    removeFile("upscaled", row.upscaledFile),
    removeFile("thumbs", row.thumbFile),
  ]);
  await db.delete(photos).where(eq(photos.id, photoId));

  return Response.json({ ok: true });
}
