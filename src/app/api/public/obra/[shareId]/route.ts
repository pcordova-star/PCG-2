// src/app/api/public/obra/[shareId]/route.ts

import { getPublicObraByShareId } from "@/server/queries/publicObra";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { shareId: string } }
) {
  const shareId = params.shareId;

  if (!shareId) {
    return NextResponse.json({ error: "No se proporcionó ID" }, { status: 400 });
  }

  try {
    const obra = await getPublicObraByShareId(shareId);
    if (!obra) {
      return NextResponse.json({ error: "Obra no encontrada" }, { status: 404 });
    }
    return NextResponse.json(obra);
  } catch (error) {
    console.error(`[API] Error al obtener obra ${shareId}:`, error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
