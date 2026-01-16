// src/app/api/comparacion-planos/analizar/route.ts
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/server/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { compararPlanosFlow } from '@/ai/flows/comparacion-planos-flow';
import { ComparacionPlanosJob, ComparacionPlanosOutput } from '@/types/comparacion-planos';
import { headers } from 'next/headers';

export const runtime = 'nodejs';
export const maxDuration = 180; // 3 minutos

async function getFileAsDataUri(storagePath: string): Promise<string> {
    const storage = getAdminApp().storage();
    // Los archivos se guardan en el bucket por defecto
    const bucket = storage.bucket(); 
    
    const [file] = await bucket.file(storagePath).download();
    
    // Siempre son JPEG por nuestro pre-procesamiento
    const mimeType = 'image/jpeg';
    return `data:${mimeType};base64,${file.toString('base64')}`;
}

export async function POST(req: Request) {
    let jobId: string | null = null;
    try {
        // Autenticación
        const authorization = headers().get("Authorization");
        if (!authorization?.startsWith("Bearer ")) {
            return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
        }
        const token = authorization.split("Bearer ")[1];
        await getAuth().verifyIdToken(token);

        // Obtener jobId del cuerpo de la solicitud
        const body = await req.json();
        jobId = body.jobId;
        if (!jobId) {
            return NextResponse.json({ error: 'jobId es requerido.' }, { status: 400 });
        }

        const db = getAdminApp().firestore();
        const jobRef = db.collection('comparacionPlanosJobs').doc(jobId);
        const jobSnap = await jobRef.get();

        if (!jobSnap.exists) {
            return NextResponse.json({ error: 'Job no encontrado.' }, { status: 404 });
        }
        
        const jobData = jobSnap.data() as ComparacionPlanosJob;
        
        if (!jobData.planoA_storagePath || !jobData.planoB_storagePath) {
             await jobRef.update({ status: 'error', errorMessage: 'Rutas de archivo en Storage no encontradas.', updatedAt: new Date() });
             return NextResponse.json({ error: 'Rutas de archivo en Storage no encontradas.' }, { status: 500 });
        }

        await jobRef.update({ status: 'processing', updatedAt: new Date() });
        
        const [planoA_DataUri, planoB_DataUri] = await Promise.all([
            getFileAsDataUri(jobData.planoA_storagePath),
            getFileAsDataUri(jobData.planoB_storagePath),
        ]);
        
        await jobRef.update({ status: 'analyzing-diff', updatedAt: new Date() });

        const resultado: ComparacionPlanosOutput = await compararPlanosFlow({
            planoA_DataUri,
            planoB_DataUri,
        });

        await jobRef.update({
            status: 'completed',
            results: resultado,
            updatedAt: new Date(),
        });

        return NextResponse.json({ success: true, message: 'Análisis completado.' });

    } catch (error: any) {
        console.error(`[API /analizar] Job ID: ${jobId}. Error:`, error);
        if (jobId) {
            try {
                const db = getAdminApp().firestore();
                const jobRef = db.collection('comparacionPlanosJobs').doc(jobId);
                await jobRef.update({ status: 'error', errorMessage: error.message || 'Error desconocido durante el análisis.', updatedAt: new Date() });
            } catch (updateError) {
                 console.error(`[API /analizar] Job ID: ${jobId}. Error al actualizar estado a error:`, updateError);
            }
        }
        
        return NextResponse.json({ error: error.message || 'Error desconocido.' }, { status: 500 });
    }
}
