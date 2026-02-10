// src/app/api/control-acceso/submit/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import admin from "@/server/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";
import { z } from "zod";
import * as crypto from 'crypto';

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
    
    // --- Guardado Crítico (Paso 1) ---
    const ciStoragePath = `control-acceso/${obraId}/${crypto.randomUUID()}.${file.name.split('.').pop() || 'bin'}`;
    const ciFile = bucket.file(ciStoragePath);
    await ciFile.save(Buffer.from(await file.arrayBuffer()), { metadata: { contentType: file.type } });
    const ciFileUrl = ciFile.publicUrl();

    const accesoRef = await db.collection("controlAcceso").add({
      obraId, companyId,
      nombre: nombreCompleto, rut, empresa, motivo,
      archivoUrl: ciFileUrl, storagePath: ciStoragePath,
      createdAt: now,
      induccionContextualId: null, // Se llenará si la IA tiene éxito
    });

    // --- Flujo de IA Opcional (Paso 2) ---
    try {
        const { generateContextualInductionWithAudio } = await import(
            "@/ai/flows/generateContextualInductionWithAudio"
        );

        const { inductionText, audioPath } = await generateContextualInductionWithAudio.run({
            obraId,
            obraNombre: obraData.nombreFaena,
            tipoObra: obraData.tipoObra || 'Edificación en altura',
            tipoPersona,
            descripcionTarea: motivo,
            duracionIngreso,
        });

        const [audioUrl] = await bucket.file(audioPath).getSignedUrl({
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000,
        });

        const evidenciaRef = db.collection("registrosInduccionContextual").doc();
        await evidenciaRef.set({
            obraId,
            obraNombre: obraData.nombreFaena,
            persona: { nombre: nombreCompleto, rut, empresa, tipo: tipoPersona },
            contexto: { descripcionTarea: motivo, duracionIngreso },
            inductionText,
            audioPath,
            audioFormat: "mp3",
            iaModel: "gemini-1.5-pro",
            createdAt: now,
            fechaPresentacion: now,
            fechaConfirmacion: null,
        });
        
        // Vincular la evidencia al registro de acceso principal
        await accesoRef.update({ induccionContextualId: evidenciaRef.id });

        return NextResponse.json({ 
            success: true, 
            inductionText, 
            audioUrl,
            evidenciaId: evidenciaRef.id
        });

    } catch (iaError: any) {
        console.warn(`[API /control-acceso/submit] Fallo en la generación de IA para el job ${accesoRef.id}, pero el registro fue exitoso.`, iaError.message);
        // El registro base ya se guardó. Devolvemos éxito al cliente, pero sin datos de inducción.
        return NextResponse.json({ success: true, inductionText: null });
    }

  } catch (error: any) {
    console.error("[API /control-acceso/submit] Error Crítico:", error);
    return NextResponse.json({ error: "No se pudo completar el registro. " + error.message, details: error.message }, { status: 500 });
  }
}