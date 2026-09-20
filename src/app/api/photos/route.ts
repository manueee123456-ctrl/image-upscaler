import { desc } from "drizzle-orm";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { ensureUploadDirs, saveBuffer, safeFilename, toPhotoDTO } from "@/lib/files";
import { upscaleTo4kHdr } from "@/lib/upscale";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/tiff",
  "image/tif",
  "image/avif",
  "image/gif",
  "image/bmp",
]);

const MAX_BYTES = 25 * 1024 * 1024;

export async function GET() {
  const rows = await db.select().from(photos).orderBy(desc(photos.createdAt));
  return Response.json({ photos: rows.map(toPhotoDTO) });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const incoming = form.get("file") ?? form.get("files");
  const extra = form.getAll("files");
  const files = [...(incoming ? [incoming] : []), ...extra].filter(
    (value, index, arr): value is File => value instanceof File && arr.indexOf(value) === index,
  );

  if (files.length === 0) {
    return Response.json({ error: "No image uploaded" }, { status: 400 });
  }

  await ensureUploadDirs();
  const created = [];

  for (const file of files) {
    if (file.size > MAX_BYTES) {
      return Response.json({ error: `${file.name} is larger than 25 MB` }, { status: 400 });
    }

    const type = file.type || "image/jpeg";
    if (type && !ALLOWED_TYPES.has(type) && !type.startsWith("image/")) {
      return Response.json({ error: `${file.name} is not a supported image` }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const id = crypto.randomUUID();
    const originalFile = safeFilename(id, file.name);
    const upscaledFile = `${id}-4k-hdr.jpg`;
    const thumbFile = `${id}-thumb.jpg`;

    let result;
    try {
      result = await upscaleTo4kHdr(bytes);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upscale image";
      return Response.json({ error: `${file.name}: ${message}` }, { status: 422 });
    }

    await saveBuffer("original", originalFile, bytes);
    await saveBuffer("upscaled", upscaledFile, result.upscaledBuffer);
    await saveBuffer("thumbs", thumbFile, result.thumbBuffer);

    const [row] = await db
      .insert(photos)
      .values({
        originalName: file.name,
        originalFile,
        upscaledFile,
        thumbFile,
        mimeType: type || "image/jpeg",
        originalWidth: result.originalWidth,
        originalHeight: result.originalHeight,
        upscaledWidth: result.upscaledWidth,
        upscaledHeight: result.upscaledHeight,
        originalBytes: bytes.byteLength,
        upscaledBytes: result.upscaledBuffer.byteLength,
      })
      .returning();

    created.push(toPhotoDTO(row));
  }

  return Response.json({ photos: created });
}
