// src/app/api/comparacion-planos/analizar/route.ts
import { NextResponse } from 'next/server';
import { getComparacionJob, updateComparacionJob, updateComparacionJobStatus } from '@/lib/comparacion-planos/firestore';
import { getPlanoAsDataUri } from '@/lib/comparacion-planos/storage';
import { runDiffFlow } from '@/ai/comparacion-planos/flows/flowDiff';
import { runCubicacionFlow } from '@/ai/comparacion-planos/flows/flowCubicacion';
import { runImpactosFlow } from '@/ai/comparacion-planos/flows/flowImpactos';
import admin from '@/server/firebaseAdmin';
import { canUserAccessCompany, getCompany } from '@/lib/comparacion-planos/permissions';
import { AppUser } from '@/types/pcg';

export const runtime = 'nodejs';
export const maxDuration = 300; // Aumentar timeout a 5 minutos para dar tiempo a los 3 análisis

/**
 * Helper para reintentar una promesa en caso de fallo.
 * @param fn La función asíncrona a ejecutar.
 * @param retries Número de reintentos.
 * @param delay Tiempo de espera entre reintentos en ms.
 * @returns El resultado de la función.
 */
async function withRetries<T>(fn: () => Promise<T>, retries = 1, delay = 300): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < retries) {
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
  throw lastError;
}


export async function POST(req: Request) {
  let jobId: string | null = null;
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: 'No autorizado: Token no proporcionado.' }, { status: 401 });
    }
    const token = authorization.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userRole = (decodedToken as any).role;
    const userCompanyId = (decodedToken as any).companyId;

    const userForPerms: AppUser = {
        id: decodedToken.uid,
        role: userRole,
        companyId: userCompanyId,
        email: decodedToken.email || '',
        nombre: decodedToken.name || '',
        createdAt: new Date()
    };
    
    const body = await req.json();
    jobId = body.jobId;

    if (!jobId) {
      return NextResponse.json({ error: 'Falta el ID del trabajo (jobId).' }, { status: 400 });
    }

    const job = await getComparacionJob(jobId);

    if (!job) {
        return NextResponse.json({ error: 'El trabajo no fue encontrado.' }, { status: 404 });
    }
    
    // --- Permission Check ---
    const hasAccessToJobCompany = await canUserAccessCompany(userForPerms, job.empresaId);
    if (!hasAccessToJobCompany) {
        return NextResponse.json({ error: 'Acceso denegado a este recurso.' }, { status: 403 });
    }
    if (userRole !== 'superadmin') {
        const company = await getCompany(userCompanyId);
        if (!company?.feature_plan_comparison_enabled) {
            return NextResponse.json({ error: 'Acceso denegado: El módulo de comparación de planos no está habilitado para su empresa.' }, { status: 403 });
        }
    }
    // --- End Permission Check ---

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

    // Step 1: Diff Técnico
    try {
        await updateComparacionJobStatus(jobId, "analyzing-diff");
        results.diffTecnico = await withRetries(() => runDiffFlow(flowInput));
    } catch (err) {
        throw new Error(`IA_DIFF_FAILED: ${(err as Error).message}`);
    }
    
    // Step 2: Cubicación Diferencial
    try {
        await updateComparacionJobStatus(jobId, "analyzing-cubicacion");
        results.cubicacionDiferencial = await withRetries(() => runCubicacionFlow(flowInput));
    } catch (err) {
        throw new Error(`IA_CUBICACION_FAILED: ${(err as Error).message}`);
    }

    // Step 3: Árbol de Impactos
    try {
        await updateComparacionJobStatus(jobId, "generating-impactos");
        results.arbolImpactos = await withRetries(() => runImpactosFlow({
            ...flowInput,
            diffContext: results.diffTecnico,
            cubicacionContext: results.cubicacionDiferencial
        }));
    } catch (err) {
        throw new Error(`IA_IMPACTOS_FAILED: ${(err as Error).message}`);
    }
    
    // Step 4: Finalización
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
