// src/app/api/comparacion-planos/status/[jobId]/route.ts
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/server/firebaseAdmin';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: { jobId: string } }) {
    const { jobId } = params;

    if (!jobId) {
        return NextResponse.json({ error: 'jobId es requerido.' }, { status: 400 });
    }

    try {
        const db = getAdminApp().firestore();
        const jobRef = db.collection('comparacionPlanosJobs').doc(jobId);
        const jobSnap = await jobRef.get();

        if (!jobSnap.exists) {
            return NextResponse.json({ error: 'Job no encontrado.' }, { status: 404 });
        }

        return NextResponse.json(jobSnap.data());
    } catch (error: any) {
        console.error(`[API /status/${jobId}] Error:`, error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor.' }, { status: 500 });
    }
}
