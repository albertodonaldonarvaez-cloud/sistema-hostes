import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSchema } from "@/lib/ensure-schema";

export async function GET() {
  try {
    await ensureSchema();

    const allGuests = await db.guest.findMany();

    const totalPersonas = allGuests.reduce((sum, g) => sum + g.invitados, 0);
    const arrivedGuests = allGuests.filter((g) => g.arrived);
    const totalArrived = arrivedGuests.reduce((sum, g) => sum + g.arrivedCount, 0);
    const totalPending = totalPersonas - totalArrived;
    const percentage = totalPersonas > 0 ? Math.round((totalArrived / totalPersonas) * 100) : 0;

    const categoryMap = new Map<string, { total: number; arrived: number; pending: number }>();
    for (const guest of allGuests) {
      const personas = guest.invitados;
      const cat = guest.categoria;
      const current = categoryMap.get(cat) || { total: 0, arrived: 0, pending: 0 };
      current.total += personas;
      if (guest.arrived) {
        current.arrived += guest.arrivedCount;
      } else {
        current.pending += personas;
      }
      categoryMap.set(cat, current);
    }

    const categories = Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      ...data,
      percentage: data.total > 0 ? Math.round((data.arrived / data.total) * 100) : 0,
    }));

    return NextResponse.json({
      totalPersonas,
      totalArrived,
      totalPending,
      percentage,
      totalInvitados: allGuests.length,
      categories,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}
