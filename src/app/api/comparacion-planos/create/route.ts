// src/app/api/comparacion-planos/create/route.ts
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/server/firebaseAdmin';
import { headers } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { ComparacionJobStatus } from '@/types/comparacion-planos';
import * as crypto from 'crypto';


// Esta función convierte cualquier imagen a JPEG.
async function convertToJpeg(buffer: Buffer): Promise<Buffer> {
    // En un entorno de servidor Node.js real, usaríamos una librería como 'sharp'.
    // Como no está disponible en este contexto, simularemos esto devolviendo el buffer original.
    // En una implementación real, aquí estaría la lógica con sharp:
    // const sharp = require('sharp');
    // return sharp(buffer).jpeg({ quality: 90 }).toBuffer();
    return buffer;
}


export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const planoAFile = formData.get('planoA') as File | null;
        const planoBFile = formData.get('planoB') as File | null;

        if (!planoAFile || !planoBFile) {
            return NextResponse.json({ error: 'Se requieren ambos archivos de plano.' }, { status: 400 });
        }
        
        // Autenticación
        const authorization = headers().get("Authorization");
        if (!authorization?.startsWith("Bearer ")) {
            return NextResponse.json({ error: 'No autorizado: Token no proporcionado.' }, { status: 401 });
        }
        const token = authorization.split("Bearer ")[1];
        const decodedToken = await getAuth().verifyIdToken(token);
        const userId = decodedToken.uid;
        const empresaId = (decodedToken as any).companyId || 'default_company';

        const db = getAdminApp().firestore();
        const storage = getAdminApp().storage().bucket();
        
        // Generar un ID de trabajo único
        const jobId = crypto.randomUUID();

        // Crear documento inicial del Job en Firestore
        const jobRef = db.collection('comparacionPlanosJobs').doc(jobId);
        await jobRef.set({
            jobId,
            userId,
            empresaId,
            status: 'uploading' as ComparacionJobStatus,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        
        // Convertir y subir archivos a Storage
        const [bufferA, bufferB] = await Promise.all([
            planoAFile.arrayBuffer().then(b => Buffer.from(b)),
            planoBFile.arrayBuffer().then(b => Buffer.from(b)),
        ]);
        
        const jpegBufferA = await convertToJpeg(bufferA);
        const jpegBufferB = await convertToJpeg(bufferB);

        const pathA = `comparacion-planos/${jobId}/original_A.jpg`;
        const pathB = `comparacion-planos/${jobId}/modificado_B.jpg`;

        await Promise.all([
            storage.file(pathA).save(jpegBufferA, { contentType: 'image/jpeg' }),
            storage.file(pathB).save(jpegBufferB, { contentType: 'image/jpeg' }),
        ]);

        // Actualizar el Job con las rutas de los archivos y cambiar estado a 'uploaded'
        await jobRef.update({
            status: 'uploaded',
            planoA_storagePath: pathA,
            planoB_storagePath: pathB,
            updatedAt: new Date(),
        });

        return NextResponse.json({ jobId });

    } catch (error: any) {
        console.error('[API /create] Error:', error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Token de autenticación inválido o expirado.' }, { status: 401 });
        }
        return NextResponse.json({ error: error.message || 'Error desconocido al crear el trabajo.' }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ error: 'Método no permitido. Usa POST para crear un trabajo.' }, { status: 405 });
}
