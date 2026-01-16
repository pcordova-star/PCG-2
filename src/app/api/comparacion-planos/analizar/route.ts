// src/app/api/comparacion-planos/analizar/route.ts
import { NextResponse } from 'next/server';
import { getComparacionJob, updateComparacionJob, updateComparacionJobStatus } from '@/lib/comparacion-planos/firestore';
import { getPlanoAsDataUri } from '@/lib/comparacion-planos/storage';
import { runDiffFlow } from '@/ai/comparacion-planos/flows/flowDiff';
import { runCubicacionFlow } from '@/ai/comparacion-planos/flows/flowCubicacion';
import { runImpactosFlow } from '@/ai/comparacion-planos/flows/flowImpactos';
import { getAuth } from 'firebase-admin/auth';
import { headers } from 'next/headers';
import { canUseComparacionPlanos } from '@/lib/comparacion-planos/permissions';

export const runtime = 'nodejs';
export const maxDuration = 180; // Aumentar timeout a 3 minutos

export async function POST(req: Request) {
  let jobId: string | null = null;
  try {
    const authorization = headers().get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: 'No autorizado: Token no proporcionado.' }, { status: 401 });
    }
    const token = authorization.split("Bearer ")[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // --- Permission Check ---
    const hasAccess = await canUseComparacionPlanos(userId);
    if (!hasAccess) {
        return NextResponse.json({ error: 'Acceso denegado a este módulo.' }, { status: 403 });
    }
    // --- End Permission Check ---

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

    await updateComparacionJobStatus(jobId, "processing");

    if (!job.planoA_storagePath || !job.planoB_storagePath) {
        throw new Error("Las rutas de los archivos en Storage no están definidas en el job.");
    }
    const [planoA_DataUri, planoB_DataUri] = await Promise.all([
        getPlanoAsDataUri(job.planoA_storagePath),
        getPlanoAsDataUri(job.planoB_storagePath),
    ]);
    const flowInput = { planoA_DataUri, planoB_DataUri };
    
    const results: any = {};

    try {
        await updateComparacionJobStatus(jobId, "analyzing-diff");
        results.diffTecnico = await runDiffFlow(flowInput);
    } catch (err) {
        throw new Error(`IA_DIFF_FAILED: ${(err as Error).message}`);
    }
    
    try {
        await updateComparacionJobStatus(jobId, "analyzing-cubicacion");
        results.cubicacionDiferencial = await runCubicacionFlow(flowInput);
    } catch (err) {
        throw new Error(`IA_CUBICACION_FAILED: ${(err as Error).message}`);
    }

    try {
        await updateComparacionJobStatus(jobId, "generating-impactos");
        results.arbolImpactos = await runImpactosFlow({
            ...flowInput,
            diffContext: results.diffTecnico,
            cubicacionContext: results.cubicacionDiferencial
        });
    } catch (err) {
        throw new Error(`IA_IMPACTOS_FAILED: ${(err as Error).message}`);
    }
    
    await updateComparacionJob(jobId, {
      status: 'completed',
      results,
    });

    return NextResponse.json({ jobId, status: "completed" });

  } catch (error: any) {
    console.error(`[API /analizar] Error en job ${jobId}:`, error);
    if (jobId) {
        const errorCode = error.message.split(':')[0].trim();
        const errorMessage = { code: errorCode, message: error.message };
        try {
            await updateComparacionJob(jobId, { status: 'error', errorMessage });
        } catch (dbError) {
             console.error(`[API /analizar] CRITICAL: No se pudo actualizar el estado del job a 'error' para ${jobId}:`, dbError);
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
    return NextResponse.json({ error: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
