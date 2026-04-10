import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSchema } from "@/lib/ensure-schema";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import * as XLSX from "xlsx";

function cleanCategoria(raw: string | undefined | null): string {
  if (!raw) return "Familia y Amigos";

  let cat = String(raw).trim();

  if (cat.toLowerCase() === "maestros - p") return "Maestros";
  if (cat.toLowerCase() === "policia") return "Policía";

  cat = cat.replace(/\s*-\s*P$/i, "");
  cat = cat.replace(/^P\s*-\s*/i, "");
  cat = cat.replace(/\s*-\s*ya$/i, "");
  cat = cat.trim();

  if (!cat || cat.toLowerCase() === "(empty)") return "Familia y Amigos";

  return cat;
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se recibió ningún archivo" },
        { status: 400 }
      );
    }

    if (
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls") &&
      file.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
      file.type !== "application/vnd.ms-excel"
    ) {
      return NextResponse.json(
        { success: false, error: "Solo se aceptan archivos .xlsx o .xls" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadDir = join(process.cwd(), "upload");
    await mkdir(uploadDir, { recursive: true });
    const filePath = join(uploadDir, "invitados.xlsx");
    await writeFile(filePath, buffer);

    const workbook = XLSX.read(buffer, { type: "buffer" });

    let sheet = workbook.Sheets["invitados"];
    if (!sheet) {
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) {
        return NextResponse.json(
          { success: false, error: "El archivo no contiene hojas" },
          { status: 500 }
        );
      }
      sheet = workbook.Sheets[firstSheet];
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
    const dataRows = rows.slice(1);

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
      if (isNaN(invitados) || invitados < 0) {
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

    return NextResponse.json({
      success: true,
      stats: { created, skipped, total },
      file: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
    });
  } catch (error) {
    console.error("Upload seed error:", error);
    return NextResponse.json(
      { success: false, error: `Error al procesar: ${error instanceof Error ? error.message : "desconocido"}` },
      { status: 500 }
    );
  }
}
