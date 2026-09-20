import { desc } from "drizzle-orm";
import { Studio } from "@/components/Studio";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { toPhotoDTO } from "@/lib/files";
import type { PhotoDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let initialPhotos: PhotoDTO[] = [];
  try {
    const rows = await db.select().from(photos).orderBy(desc(photos.createdAt));
    initialPhotos = rows.map(toPhotoDTO);
  } catch {
    initialPhotos = [];
  }
  return <Studio initialPhotos={initialPhotos} />;
}
