// src/app/api/comparacion-planos/estado/[jobId]/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { jobId: string } }) {
  const { jobId } = params;

  // ARQUITECTURA DEL ENDPOINT DE ESTADO:
  try {
    // 1. Validar que el usuario tiene permiso para consultar este job.

    // 2. Llamar a la función de la librería de Firestore para obtener el documento del job.
    //    const jobData = await getComparacionJob(jobId);

    // 3. Si el job no existe, devolver un 404.
    //    if (!jobData) {
    //      return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });
    //    }

    // 4. Si el estado es 'error', devolver el mensaje de error para mostrar en el frontend.
    //    if (jobData.status === 'error') {
    //        return NextResponse.json({
    //            status: jobData.status,
    //            errorMessage: jobData.errorMessage || { code: 'UNKNOWN_ERROR', message: 'Ocurrió un error desconocido.' }
    //        });
    //    }
    
    // 5. Si el estado es 'completed', devolver los resultados.
    //    if (jobData.status === 'completed') {
    //        return NextResponse.json({
    //            status: jobData.status,
    //            results: jobData.results || null,
    //        });
    //    }

    // 6. Para cualquier otro estado, solo devolver el estado actual.
    //    return NextResponse.json({ status: jobData.status });

  } catch (error: any) {
      // Manejar errores de lectura de Firestore, etc.
      // return NextResponse.json({ error: "Error interno al consultar el job." }, { status: 500 });
  }

  return NextResponse.json({ message: "estado endpoint placeholder", jobId: params.jobId });
}
