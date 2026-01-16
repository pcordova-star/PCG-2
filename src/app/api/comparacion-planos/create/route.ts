// src/app/api/comparacion-planos/create/route.ts
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/server/firebaseAdmin';
import { headers } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { ComparacionJobStatus } from '@/types/comparacion-planos';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function bufferToJpeg(buffer: Buffer) {
    // En un entorno de servidor Node.js, necesitamos una librería como 'sharp'
    // Como no está en las dependencias, simulamos la conversión
    // En una implementación real, aquí iría la lógica de conversión con sharp.
    return buffer;
}


export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const planoAFile = formData.get('planoA') as File | null;
        const planoBFile = formData.get('planoB') as File | null;

        if (!planoAFile || !planoBFile) {
            return NextResponse.json({ error: 'Se requieren ambos archivos.' }, { status: 400 });
        }
        
        // Autenticación (opcional pero recomendado)
        const authorization = headers().get("Authorization");
        if (!authorization) throw new Error("No autorizado");
        const token = authorization.split("Bearer ")[1];
        const decodedToken = await getAuth().verifyIdToken(token);
        const userId = decodedToken.uid;
        const empresaId = (decodedToken as any).companyId || 'default';

        const db = getAdminApp().firestore();
        const storage = getAdminApp().storage().bucket();
        const jobId = crypto.randomUUID();

        // Crear documento del Job
        const jobRef = db.collection('comparacionPlanosJobs').doc(jobId);
        await jobRef.set({
            jobId,
            userId,
            empresaId,
            status: 'uploading' as ComparacionJobStatus,
            createdAt: new Date(),
        });
        
        // Subir archivos
        const [bufferA, bufferB] = await Promise.all([
            planoAFile.arrayBuffer().then(b => Buffer.from(b)),
            planoBFile.arrayBuffer().then(b => Buffer.from(b)),
        ]);
        
        const pathA = `comparacion-planos/${jobId}/planoA.jpg`;
        const pathB = `comparacion-planos/${jobId}/planoB.jpg`;

        await Promise.all([
            storage.file(pathA).save(await bufferToJpeg(bufferA), { contentType: 'image/jpeg' }),
            storage.file(pathB).save(await bufferToJpeg(bufferB), { contentType: 'image/jpeg' }),
        ]);

        // Actualizar Job
        await jobRef.update({
            status: 'uploaded',
            planoA_storagePath: pathA,
            planoB_storagePath: pathB,
            updatedAt: new Date(),
        });

        return NextResponse.json({ jobId });

    } catch (error: any) {
        console.error('[API /create] Error:', error);
        return NextResponse.json({ error: error.message || 'Error desconocido.' }, { status: 500 });
    }
}
