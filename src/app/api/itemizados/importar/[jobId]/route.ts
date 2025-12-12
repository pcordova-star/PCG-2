// src/app/api/itemizados/importar/[jobId]/route.ts
import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';

export const runtime = 'nodejs';

type GetParams = {
  params: {
    jobId: string;
  };
};

/**
 * Endpoint para consultar el estado de un trabajo de importación de itemizado.
 */
export async function GET(request: Request, { params }: GetParams) {
  const { jobId } = params;

  if (!jobId) {
    return NextResponse.json({ error: 'jobId es requerido' }, { status: 400 });
  }

  try {
    const jobRef = doc(firebaseDb, 'itemizadoImportJobs', jobId);
    const jobSnap = await getDoc(jobRef);

    if (!jobSnap.exists()) {
      return NextResponse.json({ error: 'Trabajo no encontrado' }, { status: 404 });
    }

    const jobData = jobSnap.data();
    
    // Devolvemos solo los campos necesarios para el cliente
    const response = {
        status: jobData.status,
        result: jobData.status === 'done' ? jobData.result : null,
        error: jobData.status === 'error' ? jobData.errorMessage : null,
    };

    return NextResponse.json(response, { status: 200 });
    
  } catch (error: any) {
    console.error(`[API /status] Error fetching job ${jobId}:`, error);
    return NextResponse.json({ error: 'Error interno del servidor al consultar el trabajo.' }, { status: 500 });
  }
}
