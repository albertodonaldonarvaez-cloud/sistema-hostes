import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSchema } from "@/lib/ensure-schema";

export async function POST() {
  try {
    await ensureSchema();
    const result = await db.guest.updateMany({
      data: {
        arrived: false,
        arrivedCount: 0,
        arrivedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Se reiniciaron ${result.count} registros`,
      resetCount: result.count,
    });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json(
      { success: false, error: "Error al reiniciar llegadas" },
      { status: 500 }
    );
  }
}
