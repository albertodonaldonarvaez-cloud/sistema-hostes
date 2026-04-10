import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readFile } from "fs/promises";
import { join } from "path";
import * as XLSX from "xlsx";

function cleanCategoria(raw: string | undefined | null): string {
  if (!raw) return "Familia y Amigos";

  let cat = String(raw).trim();

  // Normalize specific categories
  if (cat.toLowerCase() === "maestros - p") return "Maestros";
  if (cat.toLowerCase() === "policia") return "Policía";

  // Strip trailing " - P", leading "P - ", trailing " - ya"
  cat = cat.replace(/\s*-\s*P$/i, "");
  cat = cat.replace(/^P\s*-\s*/i, "");
  cat = cat.replace(/\s*-\s*ya$/i, "");
  cat = cat.trim();

  // Empty string → default
  if (!cat || cat.toLowerCase() === "(empty)") return "Familia y Amigos";

  return cat;
}

export async function POST() {
  try {
    const xlsxPath = join(process.cwd(), "upload", "invitados.xlsx");
    const buffer = await readFile(xlsxPath);

    // Read the workbook
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // Get the "invitados" sheet
    const sheetName = "invitados";
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return NextResponse.json(
        { success: false, error: `Hoja "${sheetName}" no encontrada` },
        { status: 500 }
      );
    }

    // Convert to JSON (skip header row)
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      header: 1,
    }) as unknown[][];

    // Skip header (first row)
    const dataRows = rows.slice(1);

    // Clear existing data
    await db.guest.deleteMany({});

    let created = 0;
    let skipped = 0;

    for (const row of dataRows) {
      const nombre = String(row[0] ?? "").trim();
      const invitadosStr = String(row[1] ?? "").trim();
      const categoriaRaw = row[2] != null ? String(row[2]) : "";

      if (!nombre) {
        skipped++;
        continue;
      }

      const invitados = parseInt(invitadosStr, 10);
      if (isNaN(invitados)) {
        skipped++;
        continue;
      }

      const categoria = cleanCategoria(categoriaRaw);

      await db.guest.create({
        data: {
          nombre,
          invitados,
          categoria,
          activo: true,
        },
      });
      created++;
    }

    const total = await db.guest.count();
    const active = await db.guest.count({ where: { activo: true } });

    return NextResponse.json({
      success: true,
      stats: {
        created,
        updated: 0,
        skipped,
        total,
        active,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: "Error al procesar el archivo XLSX" },
      { status: 500 }
    );
  }
}
