// src/app/api/comparacion-planos/status/[jobId]/route.ts
import { NextResponse } from 'next/server';
import admin from '@/server/firebaseAdmin';
import { canUserAccessCompany } from '@/lib/comparacion-planos/permissions';
import { AppUser } from '@/types/pcg';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: { jobId: string } }) {
    const { jobId } = params;

    if (!jobId) {
        return NextResponse.json({ error: 'jobId es requerido.' }, { status: 400 });
    }

    try {
        const authorization = req.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) {
            return NextResponse.json({ error: 'No autorizado: Token no proporcionado.' }, { status: 401 });
        }
        const token = authorization.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userForPerms: AppUser = {
            id: decodedToken.uid,
            role: (decodedToken as any).role,
            companyId: (decodedToken as any).companyId,
            email: '', nombre: '', createdAt: new Date()
        };
        
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

        return NextResponse.json(jobSnap.data());
    } catch (error: any) {
        console.error(`[API /status/${jobId}] Error:`, error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor.' }, { status: 500 });
    }
}
