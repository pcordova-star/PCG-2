// src/app/api/comparacion-planos/estado/[jobId]/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { jobId: string } }) {
  const { jobId } = params;

  // ARQUITECTURA DEL ENDPOINT DE ESTADO:
  
  // 1. Validar que el usuario tiene permiso para consultar este job.

  // 2. Llamar a la función de la librería de Firestore para obtener el documento del job.
  //    const jobData = await getComparacionJob(jobId);

  // 3. Si el job no existe, devolver un 404.
  //    if (!jobData) {
  //      return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });
  //    }

  // 4. Devolver los campos relevantes para el frontend.
  //    return NextResponse.json({
  //      status: jobData.status,
  //      results: jobData.results || null,
  //      errorMessage: jobData.errorMessage || null,
  //    });

  return NextResponse.json({ message: "estado endpoint placeholder", jobId: params.jobId });
}
