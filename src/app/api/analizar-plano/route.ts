// src/app/api/analizar-plano/route.ts
import { NextResponse } from 'next/server';
import { analizarPlano, AnalisisPlanoInput } from '@/ai/flows/analisis-planos-flow';
import { ZodError } from 'zod';

export async function POST(req: Request) {
  try {
    const body: AnalisisPlanoInput = await req.json();

    // Aquí ya no hay lógica de Gemini, solo se llama al flow
    const analysisResult = await analizarPlano(body);

    return NextResponse.json(analysisResult);
    
  } catch (error: any) {
    console.error("Error en /api/analizar-plano:", error);

    let errorMessage = "Ocurrió un error durante el análisis del plano.";
    let statusCode = 500;

    if (error instanceof ZodError) {
      errorMessage = "Los datos de entrada son inválidos.";
      statusCode = 400;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
