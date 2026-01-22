// src/app/api/comparacion-planos/reanalizar/route.ts
import { NextResponse } from 'next/server';
import admin from '@/server/firebaseAdmin';
import * as crypto from 'crypto';
import { canUserAccessCompany, getCompany } from '@/lib/comparacion-planos/permissions';
import { copyPlanoFiles } from '@/lib/comparacion-planos/storage';
import { AppUser } from '@/types/pcg';
import { getComparacionJob } from '@/lib/comparacion-planos/firestore';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let newJobId: string | null = null;
  try {
    const db = admin.firestore();
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: 'No autorizado: Token no proporcionado.' }, { status: 401 });
    }
    const token = authorization.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;
    const userRole = (decodedToken as any).role;
    const userCompanyId = (decodedToken as any).companyId;
    const userForPerms: AppUser = { id: userId, role: userRole, companyId: userCompanyId, email: '', nombre: '', createdAt: new Date() };

    const { oldJobId } = await req.json();
    if (!oldJobId) {
        return NextResponse.json({ error: 'El ID del job original es requerido.' }, { status: 400 });
    }

    const oldJob = await getComparacionJob(oldJobId);
    if (!oldJob) {
        return NextResponse.json({ error: 'El job original no fue encontrado.' }, { status: 404 });
    }

    // --- Permission Check ---
    const hasAccess = await canUserAccessCompany(userForPerms, oldJob.empresaId);
    if (!hasAccess) {
        return NextResponse.json({ error: 'Acceso denegado a este recurso.' }, { status: 403 });
    }
    if (userRole !== 'superadmin') {
        if (!userCompanyId) {
            return NextResponse.json({ error: 'Acceso denegado: Usuario no asociado a una empresa.' }, { status: 403 });
        }
        const company = await getCompany(userCompanyId);
        if (!company?.feature_plan_comparison_enabled) {
            return NextResponse.json({ error: 'Acceso denegado: El módulo de comparación de planos no está habilitado para su empresa.' }, { status: 403 });
        }
    }
    // --- End Permission Check ---

    // 1. Crear nuevo ID de Job
    newJobId = crypto.randomUUID();

    // 2. Copiar archivos en Storage
    const { newPathA, newPathB } = await copyPlanoFiles(oldJobId, newJobId);
    
    // 3. Crear nuevo documento en Firestore
    const newJobRef = db.collection('comparacionPlanosJobs').doc(newJobId);
    await newJobRef.set({
      jobId: newJobId,
      userId: userId,
      empresaId: userCompanyId || 'default_company',
      status: 'uploaded',
      planoA_storagePath: newPathA,
      planoB_storagePath: newPathB,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ newJobId });

  } catch (error: any) {
    console.error(`[API /reanalizar] Error:`, error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor al re-analizar.' }, { status: 500 });
  }
}
