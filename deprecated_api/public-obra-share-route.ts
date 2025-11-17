// src/app/api/public/obra/[shareId]/route.ts
import { getPublicObraByShareId } from "@/server/queries/publicObra";
import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const revalidate = 3600; // Revalidar cada hora

export async function GET(
  req: Request,
  { params }: { params: { shareId: string } }
) {
  try {
    const data = await getPublicObraByShareId(params.shareId);

    if (!data) {
      return NextResponse.json(
        { error: "Obra no encontrada o no tiene acceso público." },
        { status: 404 }
      );
    }

    // Filtramos solo los datos que queremos exponer públicamente
    const publicData = {
      id: data.id,
      nombre: data.nombreFaena,
      cliente: data.clienteEmail,
      direccion: data.direccion,
      // ... cualquier otro campo que se decida exponer
    };

    return NextResponse.json(publicData);
    
  } catch (error) {
    console.error(`[API /public/obra] Error al obtener la obra ${params.shareId}:`, error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
