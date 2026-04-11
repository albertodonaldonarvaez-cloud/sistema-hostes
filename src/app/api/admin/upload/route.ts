import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSchema } from "@/lib/ensure-schema";
import { writeFile, readFile } from "fs/promises";
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

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { success: false, error: "Solo se aceptan archivos .xlsx o .xls" },
        { status: 400 }
      );
    }

    // Save the uploaded file to upload/invitados.xlsx
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = join(process.cwd(), "upload");
    const filePath = join(uploadDir, "invitados.xlsx");

    await writeFile(filePath, buffer);

    // Parse the Excel file
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // Try to find the right sheet
    let sheet = workbook.Sheets["invitados"];
    let sheetName = "invitados";

    if (!sheet) {
      // Fallback to first sheet
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) {
        return NextResponse.json(
          { success: false, error: "El archivo no tiene hojas" },
          { status: 400 }
        );
      }
      sheet = workbook.Sheets[firstSheet];
      sheetName = firstSheet;
    }

    // Convert to JSON rows
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
    }) as unknown[][];

    if (rows.length < 2) {
      return NextResponse.json(
        { success: false, error: "El archivo está vacío o no tiene datos" },
        { status: 400 }
      );
    }

    // Detect header mapping
    const header = rows[0].map((h) => String(h ?? "").toLowerCase().trim());
    const dataRows = rows.slice(1);

    let nombreIdx = header.indexOf("nombre");
    let invitadosIdx = header.indexOf("invitados");
    let categoriaIdx = header.indexOf("categoria");

    // Fallback: if headers not found, use positional (0, 1, 2)
    if (nombreIdx === -1) nombreIdx = 0;
    if (invitadosIdx === -1) invitadosIdx = 1;
    if (categoriaIdx === -1) categoriaIdx = 2;

    // Clear existing data
    await db.guest.deleteMany({});

    let created = 0;
    let skipped = 0;

    for (const row of dataRows) {
      const nombre = String(row[nombreIdx] ?? "").trim();
      const invitadosStr = String(row[invitadosIdx] ?? "").trim();
      const categoriaRaw = categoriaIdx >= 0 && row[categoriaIdx] != null ? String(row[categoriaIdx]) : "";

      // Skip empty rows
      if (!nombre) {
        skipped++;
        continue;
      }

      // Parse invitados count - handle non-numeric gracefully
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
      file: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      stats: {
        created,
        skipped,
        total,
        sheet: sheetName,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Error al procesar el archivo" },
      { status: 500 }
    );
  }
}
