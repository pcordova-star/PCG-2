// src/app/api/comparacion-planos/route.ts

import { NextResponse } from 'next/server';
import { compararPlanosFlow } from '@/ai/flows/comparacion-planos-flow';

export const runtime = 'nodejs';
export const maxDuration = 120; // Extender timeout a 2 minutos

// Función para convertir un buffer de archivo a Data URI
async function bufferToDataUri(buffer: Buffer, mimeType: string): Promise<string> {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const planoAFile = formData.get('planoA') as File | null;
    const planoBFile = formData.get('planoB') as File | null;

    if (!planoAFile || !planoBFile) {
      return NextResponse.json({ error: 'Se requieren ambos archivos de plano (A y B).' }, { status: 400 });
    }

    // Convertir archivos a ArrayBuffer y luego a Buffer
    const planoABuffer = Buffer.from(await planoAFile.arrayBuffer());
    const planoBBuffer = Buffer.from(await planoBFile.arrayBuffer());

    // NOTA: En una implementación real, aquí iría la lógica para convertir PDF a JPEG en el servidor.
    // Por ahora, asumimos que los archivos ya son imágenes o se pueden procesar directamente.
    // Esta es una simplificación para mantener la estructura.
    const planoA_DataUri = await bufferToDataUri(planoABuffer, planoAFile.type);
    const planoB_DataUri = await bufferToDataUri(planoBBuffer, planoBFile.type);
    
    // Llamar al flujo de Genkit con los data URIs
    const resultado = await compararPlanosFlow({
      planoA_DataUri,
      planoB_DataUri,
    });

    return NextResponse.json(resultado);

  } catch (error: any) {
    console.error('[API /comparacion-planos] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Ocurrió un error inesperado en el servidor.' },
      { status: 500 }
    );
  }
}
