// src/app/api/comparacion-planos/analizar/route.ts
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/server/firebaseAdmin';
import { compararPlanosFlow } from '@/ai/flows/comparacion-planos-flow';
import { ComparacionPlanosJob, ComparacionPlanosOutput } from '@/types/comparacion-planos';

export const runtime = 'nodejs';
export const maxDuration = 180; // 3 minutos

async function getFileAsDataUri(storagePath: string): Promise<string> {
    const storage = getAdminApp().storage();
    const [file] = await storage.bucket().file(storagePath).download();
    const mimeType = storagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${file.toString('base64')}`;
}

export async function POST(req: Request) {
    try {
        const { jobId } = await req.json();
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
             await jobRef.update({ status: 'error', errorMessage: 'Rutas de archivo en Storage no encontradas.' });
             return NextResponse.json({ error: 'Rutas de archivo en Storage no encontradas.' }, { status: 500 });
        }

        // Actualizar estado a procesando
        await jobRef.update({ status: 'processing', updatedAt: new Date() });

        // Simular progreso para el frontend
        await new Promise(res => setTimeout(res, 1000));
        await jobRef.update({ status: 'analyzing-diff', updatedAt: new Date() });
        
        // Obtener Data URIs desde Storage
        const [planoA_DataUri, planoB_DataUri] = await Promise.all([
            getFileAsDataUri(jobData.planoA_storagePath),
            getFileAsDataUri(jobData.planoB_storagePath),
        ]);

        // Ejecutar flujo de IA
        const resultado: ComparacionPlanosOutput = await compararPlanosFlow({
            planoA_DataUri,
            planoB_DataUri,
        });

        // Guardar resultados y marcar como completado
        await jobRef.update({
            status: 'completed',
            results: resultado,
            updatedAt: new Date(),
        });

        return NextResponse.json({ success: true, message: 'Análisis completado.' });

    } catch (error: any) {
        console.error('[API /analizar] Error:', error);
        // Intentar guardar el error en el job si es posible
        try {
            const { jobId } = await req.json();
            if(jobId) {
                const db = getAdminApp().firestore();
                const jobRef = db.collection('comparacionPlanosJobs').doc(jobId);
                await jobRef.update({ status: 'error', errorMessage: error.message || 'Error desconocido durante el análisis.' });
            }
        } catch (updateError) {
             console.error('[API /analizar] Error al actualizar el estado del job a error:', updateError);
        }
        
        return NextResponse.json({ error: error.message || 'Error desconocido.' }, { status: 500 });
    }
}
