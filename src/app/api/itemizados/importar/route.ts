// src/app/api/itemizados/importar/route.ts
import { NextResponse } from 'next/server';
import admin from '@/server/firebaseAdmin';
import { z } from 'zod';

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutos

const ApiInputSchema = z.object({
  pdfDataUri: z.string().min(1, "El campo pdfDataUri es requerido."),
  obraId: z.string().min(1, "El campo obraId es requerido."),
  obraNombre: z.string().min(1, "El campo obraNombre es requerido."),
  notas: z.string().optional(),
  sourceFileName: z.string().optional(), // Nuevo campo para el nombre de archivo
});

/**
 * Inicia un trabajo de importación de itemizado.
 * Valida la entrada, crea un documento en Firestore con estado 'queued'
 * y responde inmediatamente con un jobId.
 */
export async function POST(req: Request) {
  try {
    const db = admin.firestore();
    
    const body = await req.json();
    console.log("Received body for import:", body ? "Body received" : "Body is null/undefined");

    // 1. Validar la entrada con Zod
    const validationResult = ApiInputSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error.flatten());
      return NextResponse.json(
        { error: "Los datos de entrada son inválidos.", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const { pdfDataUri, obraId, obraNombre, notas, sourceFileName } = validationResult.data;

    // 2. Crear un nuevo documento de trabajo en Firestore
    const jobsCollection = db.collection("itemizadoImportJobs");
    
    const newJobDoc = {
      status: "queued",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      obraId,
      obraNombre,
      notas: notas || "",
      pdfDataUri,
      sourceFileName: sourceFileName || null, // Guardar el nombre del archivo
    };

    const docRef = await jobsCollection.add(newJobDoc);
    const jobId = docRef.id;

    // 3. Devolver una respuesta rápida (200 OK) con el ID del trabajo
    return NextResponse.json({ jobId, status: "queued" }, { status: 200 });

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


/**
 * Endpoint para consultar el estado de un trabajo de importación de itemizado
 * usando un query parameter.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: 'jobId es requerido' }, { status: 400 });
  }

  try {
    const db = admin.firestore();

    const jobRef = db.collection('itemizadoImportJobs').doc(jobId);
    const jobSnap = await jobRef.get();

    if (!jobSnap.exists()) {
      return NextResponse.json({ error: 'Trabajo no encontrado' }, { status: 404 });
    }

    const jobData = jobSnap.data()!;
    
    const response = {
        status: jobData.status,
        result: jobData.status === 'done' ? jobData.result : null,
        error: jobData.status === 'error' ? jobData.errorMessage : null,
    };

    return NextResponse.json(response, { status: 200 });
    
  } catch (error: any) {
    console.error(`[API /importar?jobId=${jobId}] Error:`, error);
    return NextResponse.json({ error: 'Error interno del servidor al consultar el trabajo.' }, { status: 500 });
  }
}
