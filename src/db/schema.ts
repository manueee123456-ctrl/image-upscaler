import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  originalName: text("original_name").notNull(),
  originalFile: text("original_file").notNull(),
  upscaledFile: text("upscaled_file").notNull(),
  thumbFile: text("thumb_file").notNull(),
  mimeType: text("mime_type").notNull(),
  originalWidth: integer("original_width").notNull(),
  originalHeight: integer("original_height").notNull(),
  upscaledWidth: integer("upscaled_width").notNull(),
  upscaledHeight: integer("upscaled_height").notNull(),
  originalBytes: integer("original_bytes").notNull(),
  upscaledBytes: integer("upscaled_bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Photo = typeof photos.$inferSelect;
