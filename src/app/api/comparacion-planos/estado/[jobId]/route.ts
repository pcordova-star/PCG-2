// src/app/api/comparacion-planos/estado/[jobId]/route.ts
import { NextResponse } from 'next/server';
import admin from '@/server/firebaseAdmin';
import { canUserAccessCompany, getCompany } from '@/lib/comparacion-planos/permissions';
import { AppUser } from '@/types/pcg';

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
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;
    const userRole = (decodedToken as any).role;
    const userCompanyId = (decodedToken as any).companyId;
    const userForPerms: AppUser = { id: userId, role: userRole, companyId: userCompanyId, email: '', nombre: '', createdAt: new Date() };

    if (!jobId) {
      return NextResponse.json({ error: 'jobId es requerido.' }, { status: 400 });
    }

    const db = admin.firestore();
    const jobRef = db.collection('comparacionPlanosJobs').doc(jobId);
    const jobSnap = await jobRef.get();

    if (!jobSnap.exists) {
      return NextResponse.json({ error: 'Job no encontrado.' }, { status: 404 });
    }

    const jobData = jobSnap.data()!;

    // --- Permission Check ---
    const hasAccess = await canUserAccessCompany(userForPerms, jobData.empresaId);
    if (!hasAccess) {
        return NextResponse.json({ error: 'Acceso denegado a este recurso.' }, { status: 403 });
    }
    // --- End Permission Check ---

    // Conversión segura de Timestamps a ISO strings
    const createdAtISO = jobData.createdAt?.toDate ? jobData.createdAt.toDate().toISOString() : null;
    const updatedAtISO = jobData.updatedAt?.toDate ? jobData.updatedAt.toDate().toISOString() : null;

    // Crear un objeto de respuesta explícitamente serializable
    const responseData = {
        jobId: jobData.jobId,
        status: jobData.status,
        results: jobData.results || null,
        errorMessage: jobData.errorMessage || null,
        createdAt: createdAtISO,
        updatedAt: updatedAtISO,
        reportUrl: jobData.reportUrl || null,
    };
    
    return NextResponse.json(responseData);
    
  } catch (error: any) {
    console.error(`[API /estado/${jobId}] Error:`, error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor al consultar el job.' }, { status: 500 });
  }
}
