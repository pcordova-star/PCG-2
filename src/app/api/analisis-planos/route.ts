// src/app/api/analizar-plano/route.ts
import { NextResponse } from "next/server";
import { analizarPlano } from "@/ai/flows/analisis-planos-flow";
import { AnalisisPlanoInputSchema } from "@/types/analisis-planos";
import type { AnalisisPlanoInput } from "@/types/analisis-planos";

export const runtime = "nodejs";
export const maxDuration = 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Permitir cualquier origen
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}


export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validationResult = AnalisisPlanoInputSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Los datos de entrada son inválidos.", details: validationResult.error.flatten() },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // El análisis con Genkit ahora se hace en el server-side flow.
    const analisisOutput = await analizarPlano(validationResult.data);

    return NextResponse.json({
      cached: false, // La lógica de caché fue eliminada para simplificar.
      cacheKey: null,
      result: analisisOutput,
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error("[API /analizar-plano] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Ocurrió un error inesperado en el servidor." },
      { status: 500, headers: corsHeaders }
    );
  }
}
