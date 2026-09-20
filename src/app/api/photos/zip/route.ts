import { readFile } from "fs/promises";
import path from "path";
import JSZip from "jszip";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { UPLOAD_ROOT } from "@/lib/files";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET() {
  const rows = await db.select().from(photos).orderBy(desc(photos.createdAt));
  if (rows.length === 0) {
    return Response.json({ error: "No photos to download" }, { status: 400 });
  }

  const zip = new JSZip();
  const used = new Set<string>();

  for (const row of rows) {
    const base = row.originalName.replace(/\.[^.]+$/, "") || "photo";
    let name = `${base}-4k-hdr.jpg`;
    let n = 2;
    while (used.has(name)) {
      name = `${base}-4k-hdr-${n}.jpg`;
      n += 1;
    }
    used.add(name);
    const buf = await readFile(path.join(UPLOAD_ROOT, "upscaled", row.upscaledFile));
    zip.file(name, buf);
  }

  const bytes = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="lumina-4k-hdr-${rows.length}.zip"`,
    },
  });
}
