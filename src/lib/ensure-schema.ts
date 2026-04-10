import { db } from "@/lib/db";

/**
 * Ensures the Guest table exists in SQLite.
 * This is needed for Docker fresh starts where the DB file exists but has no tables.
 */
let schemaEnsured = false;

export async function ensureSchema() {
  if (schemaEnsured) return;

  try {
    // Try a simple query - if table exists, this works
    await db.guest.count();
    schemaEnsured = true;
    return;
  } catch {
    // Table doesn't exist, create it with raw SQL
  }

  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Guest" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "nombre" TEXT NOT NULL,
        "invitados" INTEGER NOT NULL,
        "categoria" TEXT NOT NULL,
        "notas" TEXT,
        "activo" BOOLEAN NOT NULL DEFAULT 1,
        "arrived" BOOLEAN NOT NULL DEFAULT 0,
        "arrivedCount" INTEGER NOT NULL DEFAULT 0,
        "arrivedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      );
    `);
    schemaEnsured = true;
    console.log("[db] Guest table created successfully");
  } catch (error) {
    console.error("[db] Failed to create Guest table:", error);
    throw error;
  }
}
