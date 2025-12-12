// src/app/api/itemizados/importar/route.ts
import { NextResponse } from 'next/server';
import { importarItemizado } from '@/ai/flows/importar-itemizado-flow';
import type { ImportarItemizadoInput } from '@/ai/flows/importar-itemizado-flow';
import { z } from 'zod';

// Esquema de validación para la entrada, duplicado aquí para no depender
// de la exportación del esquema Zod desde el flujo, solo del tipo.
const ApiInputSchema = z.object({
  pdfDataUri: z.string().min(1),
  obraId: z.string().min(1),
  obraNombre: z.string().min(1),
  notas: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validar la entrada con Zod
    const validationResult = ApiInputSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Los datos de entrada son inválidos.", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const validatedInput: ImportarItemizadoInput = validationResult.data;

    // 2. Llamar al flujo de Genkit del lado del servidor
    const itemizadoOutput = await importarItemizado(validatedInput);

    // 3. Devolver la respuesta exitosa
    return NextResponse.json(itemizadoOutput);

  } catch (error: any) {
    console.error("[API /itemizados/importar] Error:", error);

    // 4. Manejar errores y devolver una respuesta de error
    const errorMessage = error.message?.includes("GENKIT_ERROR:") 
      ? error.message.replace("GENKIT_ERROR:", "").trim()
      : "Ocurrió un error inesperado en el servidor al procesar el PDF.";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
