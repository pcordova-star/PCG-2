// src/app/api/comparacion-planos/estado/[jobId]/route.ts
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/server/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { canUseComparacionPlanos } from '@/lib/comparacion-planos/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Asegura que no se cachee la respuesta

export async function GET(req: Request, { params }: { params: { jobId: string } }) {
  const { jobId } = params;

  try {
    const authorization = req.headers.get("Authorization");
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

    if (!jobId) {
      return NextResponse.json({ error: 'jobId es requerido.' }, { status: 400 });
    }

    const db = getAdminApp().firestore();
    const jobRef = db.collection('comparacionPlanosJobs').doc(jobId);
    const jobSnap = await jobRef.get();

    if (!jobSnap.exists) {
      return NextResponse.json({ error: 'Job no encontrado.' }, { status: 404 });
    }

    const jobData = jobSnap.data();

    // Devolver los datos relevantes del job
    return NextResponse.json({
        jobId: jobData?.jobId,
        status: jobData?.status,
        results: jobData?.results || null,
        errorMessage: jobData?.errorMessage || null,
        createdAt: jobData?.createdAt?.toDate ? jobData.createdAt.toDate().toISOString() : null,
        updatedAt: jobData?.updatedAt?.toDate ? jobData.updatedAt.toDate().toISOString() : null,
    });
    
  } catch (error: any) {
    console.error(`[API /estado/${jobId}] Error:`, error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor al consultar el job.' }, { status: 500 });
  }
}
