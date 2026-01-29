// src/app/api/comparacion-planos/analizar/route.ts
import { NextResponse } from 'next/server';
import admin from '@/server/firebaseAdmin';
import { canUserAccessCompany, getCompany } from '@/lib/comparacion-planos/permissions';
import { AppUser } from '@/types/pcg';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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

    const { jobId } = await req.json();
    if (!jobId) {
        return NextResponse.json({ error: 'El ID del job es requerido.' }, { status: 400 });
    }
    
    // --- Permission Check ---
    const db = admin.firestore();
    const jobRef = db.collection('comparacionPlanosJobs').doc(jobId);
    const jobSnap = await jobRef.get();

    if (!jobSnap.exists) {
        return NextResponse.json({ error: 'Job no encontrado.' }, { status: 404 });
    }
    const jobData = jobSnap.data()!;

    const hasAccess = await canUserAccessCompany(userForPerms, jobData.empresaId);
    if (!hasAccess) {
        return NextResponse.json({ error: 'Acceso denegado a este recurso.' }, { status: 403 });
    }
    // --- End Permission Check ---

    // Trigger the cloud function by updating the status
    await jobRef.update({
        status: 'queued_for_analysis',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return NextResponse.json({ success: true, message: 'El análisis ha sido puesto en cola.' });

  } catch (error: any) {
    console.error(`[API /analizar] Error:`, error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Token de autenticación inválido o expirado.' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Error interno del servidor al iniciar el análisis.' }, { status: 500 });
  }
}
