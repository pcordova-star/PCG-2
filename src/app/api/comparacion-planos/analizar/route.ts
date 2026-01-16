// src/app/api/comparacion-planos/analizar/route.ts
import { NextResponse } from 'next/server';
import { getComparacionJob, updateComparacionJob, updateComparacionJobStatus } from '@/lib/comparacion-planos/firestore';
import { getPlanoAsDataUri } from '@/lib/comparacion-planos/storage';
import { runDiffFlow } from '@/ai/comparacion-planos/flows/flowDiff';
import { runCubicacionFlow } from '@/ai/comparacion-planos/flows/flowCubicacion';
import { runImpactosFlow } from '@/ai/comparacion-planos/flows/flowImpactos';

export async function POST(req: Request) {
  let jobId: string | null = null;
  try {
    const body = await req.json();
    jobId = body.jobId;

    if (!jobId) {
      return NextResponse.json({ error: 'Falta el ID del trabajo (jobId).' }, { status: 400 });
    }

    const job = await getComparacionJob(jobId);

    if (!job) {
        return NextResponse.json({ error: 'El trabajo no fue encontrado.' }, { status: 404 });
    }
    
    if (job.status !== 'uploaded') {
        return NextResponse.json({ error: `El trabajo no está en el estado correcto para analizar (estado actual: ${job.status}).` }, { status: 409 });
    }

    // --- INICIO DEL PIPELINE DE ANÁLISIS ---

    // 1. Marcar como procesando
    await updateComparacionJobStatus(jobId, "processing");

    // 2. Obtener Data URIs de los planos desde Storage
    if (!job.planoA_storagePath || !job.planoB_storagePath) {
        throw new Error("Las rutas de los archivos en Storage no están definidas en el job.");
    }
    const [planoA_DataUri, planoB_DataUri] = await Promise.all([
        getPlanoAsDataUri(job.planoA_storagePath),
        getPlanoAsDataUri(job.planoB_storagePath),
    ]);

    // 3. Ejecutar Flow de Diff Técnico
    await updateComparacionJobStatus(jobId, "analyzing-diff");
    const diffResult = await runDiffFlow({ planoA_DataUri, planoB_DataUri });
    await updateComparacionJob(jobId, { "results.diffTecnico": diffResult });
    
    // 4. Simular análisis de cubicación
    await updateComparacionJobStatus(jobId, "analyzing-cubicacion");
    await new Promise(r => setTimeout(r, 1500)); // Simulación
    
    // 5. Simular generación de árbol de impactos
    await updateComparacionJobStatus(jobId, "generating-impactos");
    await new Promise(r => setTimeout(r, 1500)); // Simulación
    
    // 6. Marcar como completado
    await updateComparacionJobStatus(jobId, "completed");

    return NextResponse.json({ jobId, status: "completed" });

  } catch (error: any) {
    console.error(`[API /analizar] Error en job ${jobId}:`, error);
    if (jobId) {
        try {
            await updateComparacionJob(jobId, {
                status: 'error',
                errorMessage: {
                    code: error.name || "ANALYSIS_PIPELINE_FAILED",
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
