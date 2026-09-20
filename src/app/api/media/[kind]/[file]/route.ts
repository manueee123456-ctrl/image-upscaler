import { readFile } from "fs/promises";
import path from "path";
import { UPLOAD_ROOT } from "@/lib/files";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KINDS = new Set(["original", "upscaled", "thumbs"]);

type RouteContext = { params: Promise<{ kind: string; file: string }> };

function mimeFor(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "avif") return "image/avif";
  if (ext === "tif" || ext === "tiff") return "image/tiff";
  return "image/jpeg";
}

export async function GET(_request: Request, context: RouteContext) {
  const { kind, file } = await context.params;
  if (!KINDS.has(kind) || file.includes("..") || file.includes("/") || file.includes("\\")) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const buf = await readFile(path.join(UPLOAD_ROOT, kind, file));
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": mimeFor(file),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
