// src/app/api/comparacion-planos/reanalizar/route.ts
import { NextResponse } from 'next/server';
import admin from '@/server/firebaseAdmin';
import * as crypto from 'crypto';
import { canUseComparacionPlanos } from '@/lib/comparacion-planos/permissions';
import { copyPlanoFiles } from '@/lib/comparacion-planos/storage';
import { FieldValue } from 'firebase-admin/firestore';

const db = admin.firestore();

export async function POST(req: Request) {
  let newJobId: string | null = null;
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: 'No autorizado: Token no proporcionado.' }, { status: 401 });
    }
    const token = authorization.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const hasAccess = await canUseComparacionPlanos(userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Acceso denegado a este módulo.' }, { status: 403 });
    }

    const { oldJobId } = await req.json();
    if (!oldJobId) {
        return NextResponse.json({ error: 'El ID del job original es requerido.' }, { status: 400 });
    }

    // 1. Crear nuevo ID de Job
    newJobId = crypto.randomUUID();

    // 2. Copiar archivos en Storage
    const { newPathA, newPathB } = await copyPlanoFiles(oldJobId, newJobId);
    
    // 3. Crear nuevo documento en Firestore
    const newJobRef = db.collection('comparacionPlanosJobs').doc(newJobId);
    await newJobRef.set({
      jobId: newJobId,
      userId: userId,
      empresaId: (decodedToken as any).companyId || 'default_company',
      status: 'uploaded',
      planoA_storagePath: newPathA,
      planoB_storagePath: newPathB,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ newJobId });

  } catch (error: any) {
    console.error(`[API /reanalizar] Error:`, error);
    // Si la re-analización falla, no hay un job nuevo que marcar como error.
    // Simplemente devolvemos un error genérico.
    return NextResponse.json({ error: error.message || 'Error interno del servidor al re-analizar.' }, { status: 500 });
  }
}
