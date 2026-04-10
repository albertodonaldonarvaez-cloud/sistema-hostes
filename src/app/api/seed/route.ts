import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readFile } from "fs/promises";
import { join } from "path";

function cleanCategoria(raw: string): string | null {
  let cat = raw.trim();
  if (!cat) return null;

  // Check for cancelled/tachado in the raw category
  const lower = cat.toLowerCase();
  if (lower.includes("tachado") || lower.includes("cancelado")) {
    return null;
  }

  // Clean up: strip trailing " - P" and leading "P - " and trailing " - ya"
  cat = cat.replace(/\s*-\s*P$/i, "");
  cat = cat.replace(/^P\s*-\s*/i, "");
  cat = cat.replace(/\s*-\s*ya$/i, "");
  cat = cat.trim();

  return cat || null;
}

export async function POST() {
  try {
    const csvPath = join(process.cwd(), "upload", "invitados.csv");
    const csvContent = await readFile(csvPath, "utf-8");

    const lines = csvContent.split("\n").filter((l) => l.trim());
    // Skip header
    const dataLines = lines.slice(1);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const line of dataLines) {
      // Parse CSV - handle potential commas in names (but our CSV seems simple)
      const parts = line.split(",");
      if (parts.length < 2) continue;

      const nombre = parts[0].trim();
      const invitadosStr = parts[1].trim();
      const categoriaRaw = parts.length > 2 ? parts.slice(2).join(",").trim() : "";

      if (!nombre) continue;

      const invitados = parseInt(invitadosStr, 10);
      if (isNaN(invitados)) continue;

      // Check if inactive
      const isActive = invitados > 0 && !categoriaRaw.toLowerCase().includes("tachado") && !categoriaRaw.toLowerCase().includes("cancelado");

      // Clean category
      const categoria = cleanCategoria(categoriaRaw) || "Sin Categoría";

      // Upsert
      const existing = await db.guest.findFirst({ where: { nombre } });

      if (existing) {
        await db.guest.update({
          where: { id: existing.id },
          data: {
            invitados,
            categoria,
            activo: isActive,
          },
        });
        updated++;
      } else {
        await db.guest.create({
          data: {
            nombre,
            invitados,
            categoria,
            activo: isActive,
          },
        });
        created++;
      }
    }

    const total = await db.guest.count();
    const active = await db.guest.count({ where: { activo: true } });

    return NextResponse.json({
      success: true,
      stats: {
        created,
        updated,
        skipped,
        total,
        active,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: "Error al procesar el archivo CSV" },
      { status: 500 }
    );
  }
}
