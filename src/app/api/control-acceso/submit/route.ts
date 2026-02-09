// src/app/api/control-acceso/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin from "@/server/firebaseAdmin";
import { z } from "zod";
import * as crypto from 'crypto';
import { generarInduccionContextual } from "@/ai/flows/induccion-seguridad-contextual-flow";
import { textToSpeech } from "@/ai/flows/tts-flow";

const AccessRequestSchema = z.object({
  obraId: z.string().min(1),
  nombreCompleto: z.string().min(3),
  rut: z.string().min(8),
  empresa: z.string().min(2),
  motivo: z.string().min(5),
  // Añadir campos de contexto para la IA que no son parte del formulario original pero necesarios
  tipoObra: z.string().min(1),
  tipoPersona: z.enum(['trabajador', 'subcontratista', 'visita']),
  duracionIngreso: z.enum(['visita breve', 'jornada parcial', 'jornada completa']),
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!admin.apps.length) {
      console.error("Firebase Admin SDK no inicializado.");
      throw new Error("El servicio de backend no está configurado correctamente.");
    }
    
    const formData = await req.formData();
    const body = Object.fromEntries(formData.entries());

    const parsed = AccessRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de formulario inválidos.", details: parsed.error.flatten() }, { status: 400 });
    }
    
    const { obraId, nombreCompleto, rut, empresa, motivo, tipoObra, tipoPersona, duracionIngreso } = parsed.data;

    const file = formData.get('archivo') as File | null;
    if (!file) {
      return NextResponse.json({ error: "El archivo adjunto es obligatorio." }, { status: 400 });
    }
    
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    const now = admin.firestore.Timestamp.now();

    const obraDoc = await db.collection('obras').doc(obraId).get();
    if (!obraDoc.exists) {
        return NextResponse.json({ error: "La obra no existe." }, { status: 404 });
    }
    const obraData = obraDoc.data()!;
    const companyId = obraData.empresaId;

    // 1. Guardar el archivo de CI del usuario
    const fileExtension = file.name.split('.').pop() || 'bin';
    const ciStoragePath = `control-acceso/${obraId}/${crypto.randomUUID()}.${fileExtension}`;
    const ciFile = bucket.file(ciStoragePath);
    await ciFile.save(Buffer.from(await file.arrayBuffer()), { metadata: { contentType: file.type } });
    const ciFileUrl = ciFile.publicUrl();

    // 2. Generar Inducción Textual
    const { inductionText } = await generarInduccionContextual({
      tipoObra: obraData.tipoObra || 'Edificación en altura',
      nombreObra: obraData.nombreFaena,
      tipoPersona,
      descripcionTarea: motivo,
      duracionIngreso,
    });

    // 3. Generar Audio (TTS)
    let audioUrl = '';
    let audioStoragePath = '';
    try {
        const { audioDataUri } = await textToSpeech(inductionText);
        const audioBuffer = Buffer.from(audioDataUri.split(',')[1], 'base64');
        audioStoragePath = `inducciones/${obraId}/${crypto.randomUUID()}.wav`;
        const audioFile = bucket.file(audioStoragePath);
        await audioFile.save(audioBuffer, { metadata: { contentType: 'audio/wav' } });
        audioUrl = audioFile.publicUrl();
    } catch(ttsError) {
        console.error(`[TTS_ERROR] Fallo al generar audio para obra ${obraId}:`, ttsError);
        // No detenemos el flujo, continuamos sin audio.
    }


    // 4. Crear el registro de evidencia
    const evidenciaRef = db.collection("registrosInduccionContextual").doc();
    await evidenciaRef.set({
      obraId,
      obraNombre: obraData.nombreFaena,
      persona: { nombre: nombreCompleto, rut, empresa, tipo: tipoPersona },
      contexto: { descripcionTarea: motivo, duracionIngreso },
      inductionText,
      audioPath: audioStoragePath || null,
      audioUrl: audioUrl || null,
      audioFormat: audioUrl ? "wav" : null,
      jobId: "N/A",
      iaModel: "gemini-2.0-flash",
      createdAt: now,
      fechaPresentacion: now,
      fechaConfirmacion: null,
    });
    
    // 5. Guardar el registro de acceso original
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
        audioUrl,
        evidenciaId: evidenciaRef.id
    });

  } catch (error: any) {
    console.error("[API /control-acceso/submit] Error:", error);
    return NextResponse.json({ error: error.message || "Error interno del servidor.", details: error.message }, { status: 500 });
  }
}
