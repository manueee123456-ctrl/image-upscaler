import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const databaseUrl = process.env.DATABASE_URL || "libsql://placeholder.turso.io";

const client = createClient({
  url: databaseUrl,
});

export const db = drizzle(client);
