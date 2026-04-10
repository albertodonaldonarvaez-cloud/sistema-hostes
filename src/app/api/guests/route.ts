import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const categoria = searchParams.get("categoria") || "";
    const arrived = searchParams.get("arrived") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.nombre = { contains: search };
    }
    if (categoria) {
      where.categoria = categoria;
    }
    if (arrived === "true") {
      where.arrived = true;
    } else if (arrived === "false") {
      where.arrived = false;
    }

    const guests = await db.guest.findMany({
      where,
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
    });

    return NextResponse.json({ guests });
  } catch (error) {
    console.error("GET guests error:", error);
    return NextResponse.json(
      { error: "Error al obtener invitados" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, count } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID requerido" },
        { status: 400 }
      );
    }

    const guest = await db.guest.findUnique({ where: { id } });
    if (!guest) {
      return NextResponse.json(
        { error: "Invitado no encontrado" },
        { status: 404 }
      );
    }

    // Toggle arrival
    const newArrived = !guest.arrived;
    const newArrivedCount = newArrived
      ? (body.count !== undefined && body.count !== null ? parseInt(body.count) : guest.invitados)
      : 0;
    const updated = await db.guest.update({
      where: { id },
      data: {
        arrived: newArrived,
        arrivedCount: newArrivedCount,
        arrivedAt: newArrived ? new Date() : null,
      },
    });

    return NextResponse.json({ guest: updated });
  } catch (error) {
    console.error("POST guest error:", error);
    return NextResponse.json(
      { error: "Error al registrar llegada" },
      { status: 500 }
    );
  }
}

export async function PATCH() {
  try {
    const result = await db.guest.updateMany({
      data: {
        arrived: false,
        arrivedCount: 0,
        arrivedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      resetCount: result.count,
    });
  } catch (error) {
    console.error("PATCH guests error:", error);
    return NextResponse.json(
      { error: "Error al resetear llegadas" },
      { status: 500 }
    );
  }
}
