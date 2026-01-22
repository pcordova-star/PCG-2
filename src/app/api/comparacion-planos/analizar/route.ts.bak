// =======================================================
//  Runtime configuration — MUST BE THE FIRST LINES
// =======================================================
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 300;

// =======================================================
//  Imports
// =======================================================
import { NextResponse } from "next/server";

import {
  getComparacionJob,
  updateComparacionJob,
  updateComparacionJobStatus,
} from "@/lib/comparacion-planos/firestore";

import { getPlanoAsDataUri } from "@/lib/comparacion-planos/storage";

import { runDiffFlow } from "@/ai/comparacion-planos/flows/flowDiff";
import { runCubicacionFlow } from "@/ai/comparacion-planos/flows/flowCubicacion";
import { runImpactosFlow } from "@/ai/comparacion-planos/flows/flowImpactos";

import {
  canUserAccessCompany,
  getCompany,
} from "@/lib/comparacion-planos/permissions";

import { AppUser } from "@/types/pcg";

// =======================================================
//  Dynamic import for firebase-admin (BUILD SAFE)
// =======================================================
let adminInstance: any;

async function getAdmin() {
  if (!adminInstance) {
    adminInstance = (await import("@/server/firebaseAdmin")).default;
  }
  return adminInstance;
}

// =======================================================
//  Retry helper
// =======================================================
async function withRetries<T>(
  fn: () => Promise<T>,
  retries = 1,
  delay = 300
): Promise<T> {
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries) {
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  throw lastError;
}

// =======================================================
//  POST /api/comparacion-planos/analizar
// =======================================================
export async function POST(req: Request) {
  let jobId: string | null = null;

  try {
    // -------- AUTH --------
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No autorizado: falta Bearer token" },
        { status: 401 }
      );
    }

    const token = authorization.replace("Bearer ", "");
    const admin = await getAdmin();
    const decoded = await admin.auth().verifyIdToken(token);

    const userRole = (decoded as any).role;
    const userCompanyId = (decoded as any).companyId;

    const userForPerms: AppUser = {
      id: decoded.uid,
      role: userRole,
      companyId: userCompanyId,
      email: decoded.email || "",
      nombre: decoded.name || "",
      createdAt: new Date(),
    };

    // -------- REQUEST BODY --------
    const body = await req.json();
    jobId = body?.jobId;

    if (!jobId) {
      return NextResponse.json({ error: "Falta jobId" }, { status: 400 });
    }

    // -------- LOAD JOB --------
    const job = await getComparacionJob(jobId);
    if (!job) {
      return NextResponse.json(
        { error: "El trabajo no existe" },
        { status: 404 }
      );
    }

    // -------- PERMISSIONS --------
    const okCompany = await canUserAccessCompany(userForPerms, job.empresaId);
    if (!okCompany) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    if (userRole !== "superadmin") {
      const company = await getCompany(userCompanyId);
      if (!company?.feature_plan_comparison_enabled) {
        return NextResponse.json(
          { error: "Funcionalidad no habilitada para su empresa" },
          { status: 403 }
        );
      }
    }

    if (job.status !== "uploaded") {
      return NextResponse.json(
        {
          error: `El trabajo no está listo para analizar (estado: ${job.status})`,
        },
        { status: 409 }
      );
    }

    await updateComparacionJobStatus(jobId, "processing");

    // -------- LOAD PLANOS --------
    if (!job.planoA_storagePath || !job.planoB_storagePath) {
      throw new Error("Rutas de plano A o B no definidas.");
    }

    const [imgA, imgB] = await Promise.all([
      getPlanoAsDataUri(job.planoA_storagePath),
      getPlanoAsDataUri(job.planoB_storagePath),
    ]);

    const flowInput = { planoA_DataUri: imgA, planoB_DataUri: imgB };
    const results: any = {};

    // -------- STEP 1: DIFF --------
    try {
      await updateComparacionJobStatus(jobId, "analyzing-diff");
      results.diffTecnico = await withRetries(() =>
        runDiffFlow(flowInput)
      );
    } catch (err: any) {
      throw new Error(`IA_DIFF_FAILED: ${err.message}`);
    }

    // -------- STEP 2: CUBICACIÓN --------
    try {
      await updateComparacionJobStatus(jobId, "analyzing-cubicacion");
      results.cubicacionDiferencial = await withRetries(() =>
        runCubicacionFlow(flowInput)
      );
    } catch (err: any) {
      throw new Error(`IA_CUBICACION_FAILED: ${err.message}`);
    }

    // -------- STEP 3: IMPACTOS --------
    try {
      await updateComparacionJobStatus(jobId, "generating-impactos");
      results.arbolImpactos = await withRetries(() =>
        runImpactosFlow({
          ...flowInput,
          diffContext: results.diffTecnico,
          cubicacionContext: results.cubicacionDiferencial,
        })
      );
    } catch (err: any) {
      throw new Error(`IA_IMPACTOS_FAILED: ${err.message}`);
    }

    // -------- SAVE RESULT --------
    await updateComparacionJob(jobId, {
      status: "completed",
      results,
    });

    return NextResponse.json({ jobId, status: "completed" });
  } catch (error: any) {
    console.error(`[API /analizar] ERROR EN JOB ${jobId}:`, error);

    if (jobId) {
      await updateComparacionJob(jobId, {
        status: "error",
        errorMessage: {
          code: error.message?.split(":")[0] || "ERROR",
          message: error.message || "Error desconocido",
        },
      });
    }

    return NextResponse.json(
      { error: error.message || "Error interno" },
      { status: 500 }
    );
  }
}
