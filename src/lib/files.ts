import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import type { Photo } from "@/db/schema";
import type { PhotoDTO } from "@/lib/types";

export const UPLOAD_ROOT = path.join(process.cwd(), "data", "uploads");

export async function ensureUploadDirs() {
  await mkdir(path.join(UPLOAD_ROOT, "original"), { recursive: true });
  await mkdir(path.join(UPLOAD_ROOT, "upscaled"), { recursive: true });
  await mkdir(path.join(UPLOAD_ROOT, "thumbs"), { recursive: true });
}

export function mediaUrl(kind: "original" | "upscaled" | "thumbs", filename: string) {
  return `/api/media/${kind}/${filename}`;
}

export function toPhotoDTO(row: Photo): PhotoDTO {
  return {
    id: row.id,
    originalName: row.originalName,
    originalFile: row.originalFile,
    upscaledFile: row.upscaledFile,
    thumbFile: row.thumbFile,
    mimeType: row.mimeType,
    originalWidth: row.originalWidth,
    originalHeight: row.originalHeight,
    upscaledWidth: row.upscaledWidth,
    upscaledHeight: row.upscaledHeight,
    originalBytes: row.originalBytes,
    upscaledBytes: row.upscaledBytes,
    createdAt: row.createdAt.toISOString(),
    originalUrl: mediaUrl("original", row.originalFile),
    upscaledUrl: mediaUrl("upscaled", row.upscaledFile),
    thumbUrl: mediaUrl("thumbs", row.thumbFile),
  };
}

export async function saveBuffer(kind: "original" | "upscaled" | "thumbs", filename: string, data: Buffer) {
  await ensureUploadDirs();
  const dest = path.join(UPLOAD_ROOT, kind, filename);
  await writeFile(dest, data);
  return dest;
}

export async function removeFile(kind: "original" | "upscaled" | "thumbs", filename: string) {
  try {
    await unlink(path.join(UPLOAD_ROOT, kind, filename));
  } catch {
    // already gone
  }
}

export function safeFilename(id: string, originalName: string, forcedExt?: string) {
  const raw = originalName.split(".").pop()?.toLowerCase() ?? "jpg";
  const ext = forcedExt ?? (/^[a-z0-9]{1,5}$/.test(raw) ? raw : "jpg");
  return `${id}.${ext}`;
}
