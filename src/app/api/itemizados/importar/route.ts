// src/app/api/itemizados/importar/route.ts
import { NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { z } from 'zod';

export const runtime = "nodejs";

const ApiInputSchema = z.object({
  pdfDataUri: z.string().min(1),
  obraId: z.string().min(1),
  obraNombre: z.string().min(1),
  notas: z.string().optional(),
});

/**
 * Inicia un trabajo de importación de itemizado.
 * Valida la entrada, crea un documento en Firestore con estado 'queued'
 * y responde inmediatamente con un jobId.
 */
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
    
    const { pdfDataUri, obraId, obraNombre, notas } = validationResult.data;

    // 2. Crear un nuevo documento de trabajo en Firestore
    const jobsCollection = collection(firebaseDb, "itemizadoImportJobs");
    
    const newJobDoc = {
      status: "queued",
      createdAt: serverTimestamp(),
      obraId,
      obraNombre,
      notas: notas || "",
      // El PDF se guarda directamente aquí. Para archivos más grandes, se usaría Storage.
      pdfDataUri,
    };

    const docRef = await addDoc(jobsCollection, newJobDoc);
    const jobId = docRef.id;

    // 3. Devolver una respuesta rápida (202 Accepted) con el ID del trabajo
    return NextResponse.json({ jobId, status: "queued" }, { status: 202 });

  } catch (error: any) {
    console.error("[API /importar POST] Error:", error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: "El cuerpo de la solicitud no es un JSON válido." }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Error interno del servidor al iniciar el trabajo de importación." },
      { status: 500 }
    );
  }
}
