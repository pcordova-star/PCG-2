// src/app/api/analizar-plano/route.ts
import { NextResponse } from 'next/server';
import { analizarPlano } from '@/ai/flows/analisis-planos-flow';
import { AnalisisPlanoInputSchema, AnalisisPlanoInput } from '@/types/analisis-planos';

export const runtime = "nodejs";
export const maxDuration = 60; // 60 segundos de timeout

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validar la entrada con Zod
    const validationResult = AnalisisPlanoInputSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Los datos de entrada son inválidos.", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const validatedInput: AnalisisPlanoInput = validationResult.data;

    // 2. Llamar al flujo de Genkit del lado del servidor
    const analisisOutput = await analizarPlano(validatedInput);

    // 3. Devolver la respuesta exitosa
    return NextResponse.json(analisisOutput);

  } catch (error: any) {
    console.error("[API /analizar-plano] Error:", error);

    // 4. Manejar errores y devolver una respuesta de error
    return NextResponse.json(
      { error: error.message || "Ocurrió un error inesperado en el servidor." },
      { status: 500 }
    );
  }
}
