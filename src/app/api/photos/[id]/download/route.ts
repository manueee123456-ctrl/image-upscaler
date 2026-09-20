import { readFile } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { UPLOAD_ROOT } from "@/lib/files";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function downloadName(originalName: string, variant: string) {
  const base = originalName.replace(/\.[^.]+$/, "") || "photo";
  if (variant === "original") return originalName;
  return `${base}-4k-hdr.jpg`;
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const photoId = Number(id);
  if (!Number.isFinite(photoId)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const variant = new URL(request.url).searchParams.get("variant") === "original" ? "original" : "upscaled";
  const [row] = await db.select().from(photos).where(eq(photos.id, photoId)).limit(1);
  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const filename = variant === "original" ? row.originalFile : row.upscaledFile;
  const abs = path.join(UPLOAD_ROOT, variant, filename);
  const buf = await readFile(abs);
  const mime = variant === "upscaled" ? "image/jpeg" : row.mimeType || "application/octet-stream";
  const name = downloadName(row.originalName, variant);

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${name.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
