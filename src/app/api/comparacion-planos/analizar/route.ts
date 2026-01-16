// src/app/api/comparacion-planos/analizar/route.ts
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/server/firebaseAdmin';
import { getDoc, doc, Timestamp } from 'firebase-admin/firestore';
import { ComparacionJobStatus } from '@/types/comparacion-planos';

const db = getAdminApp().firestore();

// Helper to update job status and timestamp
const updateJobStatus = async (jobId: string, status: ComparacionJobStatus, details?: object) => {
  const jobRef = db.collection('comparacionPlanosJobs').doc(jobId);
  await jobRef.update({ status, updatedAt: Timestamp.now(), ...details });
};


export async function POST(req: Request) {
  let jobId: string | null = null;
  try {
    const body = await req.json();
    jobId = body.jobId;

    if (!jobId) {
      return NextResponse.json({ error: 'Falta el ID del trabajo (jobId).' }, { status: 400 });
    }

    const jobRef = db.collection('comparacionPlanosJobs').doc(jobId);
    const jobSnap = await getDoc(jobRef);

    if (!jobSnap.exists) {
        return NextResponse.json({ error: 'El trabajo no fue encontrado.' }, { status: 404 });
    }

    const currentStatus = jobSnap.data()?.status;
    if (currentStatus !== 'uploaded') {
        return NextResponse.json({ error: `El trabajo no está en el estado correcto para analizar (estado actual: ${currentStatus}).` }, { status: 409 });
    }

    // --- INICIO DE LA SIMULACIÓN DEL PIPELINE ---

    // 1. Marcar como procesando
    await updateJobStatus(jobId, "processing");
    await new Promise(r => setTimeout(r, 500));

    // 2. Simular análisis de diferencias
    await updateJobStatus(jobId, "analyzing-diff");
    await new Promise(r => setTimeout(r, 1000));
    // En el futuro: const diffResult = await runDiffFlow(...);

    // 3. Simular análisis de cubicación
    await updateJobStatus(jobId, "analyzing-cubicacion");
    await new Promise(r => setTimeout(r, 1000));
    // En el futuro: const cubicacionResult = await runCubicacionFlow(...);
    
    // 4. Simular generación de árbol de impactos
    await updateJobStatus(jobId, "generating-impactos");
    await new Promise(r => setTimeout(r, 1000));
    // En el futuro: const impactosResult = await runImpactosFlow(...);
    
    // 5. Guardar resultados (placeholder) y marcar como completado
    await updateJobStatus(jobId, "completed", {
      results: {
        diffTecnico: "Placeholder de resultados del diff técnico.",
        cubicacionDiferencial: "Placeholder de resultados de la cubicación.",
        arbolImpactos: [],
      }
    });

    // --- FIN DE LA SIMULACIÓN ---
    
    return NextResponse.json({ jobId, status: "completed" });

  } catch (error: any) {
    console.error(`[API /analizar] Error en job ${jobId}:`, error);
    if (jobId) {
        try {
            await updateJobStatus(jobId, "error", {
                errorMessage: {
                    code: "ANALYSIS_PIPELINE_FAILED",
                    message: error.message,
                }
            });
        } catch (dbError) {
             console.error(`[API /analizar] CRITICAL: No se pudo actualizar el estado del job a 'error' para ${jobId}:`, dbError);
        }
    }
    return NextResponse.json({ error: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
