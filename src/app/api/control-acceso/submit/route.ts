// src/app/api/control-acceso/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin from "@/server/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";
import { z } from "zod";
import * as crypto from 'crypto';
import { generateContextualInductionWithAudio } from "@/ai/flows/generateContextualInductionWithAudio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AccessRequestSchema = z.object({
  obraId: z.string().min(1),
  nombreCompleto: z.string().min(3),
  rut: z.string().min(8),
  empresa: z.string().min(2),
  motivo: z.string().min(5),
  tipoPersona: z.enum(['trabajador', 'subcontratista', 'visita']),
  duracionIngreso: z.enum(['visita breve', 'jornada parcial', 'jornada completa']),
});

export async function POST(req: NextRequest) {
  try {
    if (!admin.apps.length) {
      console.error("Firebase Admin SDK no inicializado en /api/control-acceso/submit.");
      throw new Error("El servicio de backend no está configurado correctamente.");
    }
    
    const formData = await req.formData();
    const body = Object.fromEntries(formData.entries());

    const parsed = AccessRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de formulario inválidos.", details: parsed.error.flatten() }, { status: 400 });
    }
    
    const { obraId, nombreCompleto, rut, empresa, motivo, tipoPersona, duracionIngreso } = parsed.data;

    const file = formData.get('archivo') as File | null;
    if (!file) {
      return NextResponse.json({ error: "El archivo adjunto es obligatorio." }, { status: 400 });
    }
    
    const db = admin.firestore();
    const bucket = getStorage().bucket();
    const now = admin.firestore.Timestamp.now();

    const obraDoc = await db.collection('obras').doc(obraId).get();
    if (!obraDoc.exists) {
        return NextResponse.json({ error: "La obra no existe." }, { status: 404 });
    }
    const obraData = obraDoc.data()!;
    const companyId = obraData.empresaId;

    // --- Ejecutar Flujo de IA + TTS ---
    const { inductionText, audioPath } = await generateContextualInductionWithAudio.run({
      obraId,
      obraNombre: obraData.nombreFaena,
      tipoObra: obraData.tipoObra || 'Edificación en altura',
      tipoPersona,
      descripcionTarea: motivo,
      duracionIngreso,
    });
    
    // --- Generar URL firmada para el audio ---
    const [audioUrl] = await bucket.file(audioPath).getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutos de validez
    });

    // 1. Guardar el archivo de CI del usuario
    const fileExtension = file.name.split('.').pop() || 'bin';
    const ciStoragePath = `control-acceso/${obraId}/${crypto.randomUUID()}.${fileExtension}`;
    const ciFile = bucket.file(ciStoragePath);
    await ciFile.save(Buffer.from(await file.arrayBuffer()), { metadata: { contentType: file.type } });
    const ciFileUrl = ciFile.publicUrl();

    // 2. Crear el registro de evidencia
    const evidenciaRef = db.collection("registrosInduccionContextual").doc();
    await evidenciaRef.set({
      obraId,
      obraNombre: obraData.nombreFaena,
      persona: { nombre: nombreCompleto, rut, empresa, tipo: tipoPersona },
      contexto: { descripcionTarea: motivo, duracionIngreso },
      inductionText,
      audioPath: audioPath, // Guardamos el path, no la URL firmada
      audioFormat: "mp3",
      jobId: "N/A", // Job ID de Genkit si es necesario auditar
      iaModel: "gemini-1.5-pro",
      createdAt: now,
      fechaPresentacion: now,
      fechaConfirmacion: null,
    });
    
    // 3. Guardar el registro de acceso original
    await db.collection("controlAcceso").add({
      obraId, companyId,
      nombre: nombreCompleto, rut, empresa, motivo,
      archivoUrl: ciFileUrl, storagePath: ciStoragePath,
      createdAt: now,
      induccionContextualId: evidenciaRef.id,
    });

    return NextResponse.json({ 
        success: true, 
        inductionText, 
        audioUrl, // URL firmada para el cliente
        evidenciaId: evidenciaRef.id
    });

  } catch (error: any) {
    console.error("[API /control-acceso/submit] Error:", error);
    return NextResponse.json({ error: error.message || "Error interno del servidor.", details: error.message }, { status: 500 });
  }
}
