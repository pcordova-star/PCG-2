// src/app/api/comparacion-planos/upload/route.ts
import { NextResponse } from 'next/server';
import admin, { bucket } from '@/server/firebaseAdmin';
import { ComparacionJobStatus } from '@/types/comparacion-planos';
import * as crypto from 'crypto';
import { getCompany } from '@/lib/comparacion-planos/permissions';
import { AppUser } from '@/types/pcg';

const MAX_FILE_SIZE_MB = 15;

export async function POST(req: Request) {
    const db = admin.firestore();
    let jobId: string | null = null;
    try {
        const authorization = req.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) {
            return NextResponse.json({ error: 'No autorizado: Token no proporcionado.' }, { status: 401 });
        }
        const token = authorization.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userId = decodedToken.uid;
        const userRole = (decodedToken as any).role;
        const empresaId = (decodedToken as any).companyId;

        // --- Permission Check ---
        if (userRole !== 'superadmin') {
            if (!empresaId) {
                return NextResponse.json({ error: 'Acceso denegado: Usuario no asociado a una empresa.' }, { status: 403 });
            }
            const company = await getCompany(empresaId);
            if (!company?.feature_plan_comparison_enabled) {
                return NextResponse.json({ error: 'Acceso denegado: El módulo de comparación de planos no está habilitado para su empresa.' }, { status: 403 });
            }
        }
        // --- End Permission Check ---

        const formData = await req.formData();
        const planoAFile = formData.get('planoA') as File | null;
        const planoBFile = formData.get('planoB') as File | null;

        if (!planoAFile || !planoBFile) {
            return NextResponse.json({ error: 'Se requieren ambos archivos de plano.' }, { status: 400 });
        }
        
        if (planoAFile.size > MAX_FILE_SIZE_MB * 1024 * 1024 || planoBFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
             return NextResponse.json({ error: `El tamaño de los archivos no puede superar los ${MAX_FILE_SIZE_MB}MB.` }, { status: 400 });
        }
        
        jobId = crypto.randomUUID();
        
        const jobRef = db.collection('comparacionPlanosJobs').doc(jobId);
        await jobRef.set({
            jobId,
            userId,
            empresaId: empresaId || 'default_company',
            status: 'pending-upload' as ComparacionJobStatus,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        
        const [bufferA, bufferB] = await Promise.all([
            planoAFile.arrayBuffer().then(b => Buffer.from(b)),
            planoBFile.arrayBuffer().then(b => Buffer.from(b)),
        ]);
        
        // Ahora siempre guardamos como .jpg porque la conversión ocurre en el cliente
        const pathA = `comparacion-planos/${jobId}/A.jpg`;
        const pathB = `comparacion-planos/${jobId}/B.jpg`;

        await Promise.all([
            bucket.file(pathA).save(bufferA, { contentType: 'image/jpeg' }),
            bucket.file(pathB).save(bufferB, { contentType: 'image/jpeg' }),
        ]);

        await jobRef.update({
            status: 'uploaded',
            planoA_storagePath: pathA,
            planoB_storagePath: pathB,
            updatedAt: new Date(),
        });
        
        return NextResponse.json({ jobId, status: "uploaded" });

    } catch (error: any) {
        if (jobId) {
            try {
                const jobRef = db.collection('comparacionPlanosJobs').doc(jobId);
                await jobRef.update({
                    status: 'error',
                    errorMessage: {
                        code: error.code || "UPLOAD_FAILED",
                        message: error.message,
                    },
                    updatedAt: new Date(),
                });
            } catch (dbError) {
                console.error("Failed to update job status to error:", dbError);
            }
        }
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Token de autenticación inválido o expirado.' }, { status: 401 });
        }
        return NextResponse.json({ error: error.message || 'Error desconocido al crear el trabajo.' }, { status: 500 });
    }
}
