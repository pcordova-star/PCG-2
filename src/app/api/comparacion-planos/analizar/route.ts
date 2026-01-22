// src/app/api/comparacion-planos/analizar/route.ts

// --- Runtime configuration (MUST COME FIRST) ---
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

// --- Imports ---
import { NextResponse } from 'next/server';
import {
  getComparacionJob,
  updateComparacionJob,
  updateComparacionJobStatus
} from '@/lib/comparacion-planos/firestore';
import { getPlanoAsDataUri } from '@/lib/comparacion-planos/storage';

import { runDiffFlow } from '@/ai/comparacion-planos/flows/flowDiff';
import { runCubicacionFlow } from '@/ai/comparacion-planos/flows/flowCubicacion';
import { runImpactosFlow } from '@/ai/comparacion-planos/flows/flowImpactos';

import { canUserAccessCompany, getCompany } from '@/lib/comparacion-planos/permissions';
import { AppUser } from '@/types/pcg';

// --- FIX: Load firebase-admin at runtime only ---
let admin: any;
async function getAdmin() {
  if (!admin) {
    admin = (await import('@/server/firebaseAdmin')).default;
  }
  return admin;
}

// --- Helper for retries ---
async function withRetries<T>(
  fn: () => Promise<T>,
  retries = 1,
  delay = 300
): Promise<T> {
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

// --- API Handler ---
export async function POST(req: Request) {
  let jobId: string | null = null;

  try {
    // --- Auth ---
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado: Token no proporcionado.' }, { status: 401 });
    }

    const token = authorization.split('Bearer ')[1];
    const adminSDK = await getAdmin();
    const decodedToken = await adminSDK.auth().verifyIdToken(token);

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

    // --- Parse request ---
    const body = await req.json();
    jobId = body.jobId;

    if (!jobId) {
      return NextResponse.json({ error: 'Falta jobId.' }, { status: 400 });
    }

    const job = await getComparacionJob(jobId);
    if (!job) {
      return NextResponse.json({ error: 'El trabajo no fue encontrado.' }, { status: 404 });
    }

    // --- Permission checks ---
    const hasAccessToJobCompany = await canUserAccessCompany(userForPerms, job.empresaId);
    if (!hasAccessToJobCompany) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    if (userRole !== 'superadmin') {
      const company = await getCompany(userCompanyId);
      if (!company?.feature_plan_comparison_enabled) {
        return NextResponse.json({ error: 'Funcionalidad no habilitada.' }, { status: 403 });
      }
    }

    if (job.status !== 'uploaded') {
      return NextResponse.json(
        { error: `El trabajo no está listo para analizar: estado ${job.status}` },
        { status: 409 }
      );
    }

    await updateComparacionJobStatus(jobId, 'processing');

    // --- Load planos ---
    if (!job.planoA_storagePath || !job.planoB_storagePath) {
      throw new Error('Rutas de planos faltantes en job.');
    }

    const [planoA_DataUri, planoB_DataUri] = await Promise.all([
      getPlanoAsDataUri(job.planoA_storagePath),
      getPlanoAsDataUri(job.planoB_storagePath)
    ]);

    const flowInput = { planoA_DataUri, planoB_DataUri };
    const results: any = {};

    // --- Step 1 ---
    try {
      await updateComparacionJobStatus(jobId, 'analyzing-diff');
      results.diffTecnico = await withRetries(() => runDiffFlow(flowInput));
    } catch (err) {
      throw new Error(`IA_DIFF_FAILED: ${(err as Error).message}`);
    }

    // --- Step 2 ---
    try {
      await updateComparacionJobStatus(jobId, 'analyzing-cubicacion');
      results.cubicacionDiferencial = await withRetries(() =>
        runCubicacionFlow(flowInput)
      );
    } catch (err) {
      throw new Error(`IA_CUBICACION_FAILED: ${(err as Error).message}`);
    }

    // --- Step 3 ---
    try {
      await updateComparacionJobStatus(jobId, 'generating-impactos');
      results.arbolImpactos = await withRetries(() =>
        runImpactosFlow({
          ...flowInput,
          diffContext: results.diffTecnico,
          cubicacionContext: results.cubicacionDiferencial
        })
      );
    } catch (err) {
      throw new Error(`IA_IMPACTOS_FAILED: ${(err as Error).message}`);
    }

    // --- Save ---
    await updateComparacionJob(jobId, {
      status: 'completed',
      results
    });

    return NextResponse.json({ jobId, status: 'completed' });

  } catch (error: any) {
    console.error(`[API /analizar] Error:`, error);

    if (jobId) {
      const errorCode = error.message.split(':')[0].trim();
      await updateComparacionJob(jobId, {
        status: 'error',
        errorMessage: { code: errorCode, message: error.message }
      });
    }

    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
