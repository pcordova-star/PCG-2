// src/app/api/control-acceso/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin from "@/server/firebaseAdmin";
import { z } from "zod";
import * as crypto from 'crypto';

const AccessRequestSchema = z.object({
  obraId: z.string().min(1),
  nombreCompleto: z.string().min(3),
  rut: z.string().min(8),
  empresa: z.string().min(2),
  motivo: z.string().min(1),
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const body = Object.fromEntries(formData.entries());

    const parsed = AccessRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de formulario inválidos.", details: parsed.error.flatten() }, { status: 400 });
    }
    const { obraId, nombreCompleto, rut, empresa, motivo } = parsed.data;

    const file = formData.get('archivo') as File | null;
    if (!file) {
      return NextResponse.json({ error: "El archivo adjunto es obligatorio." }, { status: 400 });
    }
    const MAX_SIZE_MB = 10;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `El archivo supera el límite de ${MAX_SIZE_MB}MB.` }, { status: 400 });
    }

    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    
    // Get companyId from obra
    const obraDoc = await db.collection('obras').doc(obraId).get();
    if (!obraDoc.exists) {
        return NextResponse.json({ error: "La obra no existe." }, { status: 404 });
    }
    const companyId = obraDoc.data()?.empresaId;
    if (!companyId) {
        return NextResponse.json({ error: "La obra no está asociada a una empresa." }, { status: 500 });
    }
    
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    const fileExtension = file.name.split('.').pop() || 'bin';
    const uniqueFilename = `${crypto.randomUUID()}.${fileExtension}`;
    const storagePath = `control-acceso/${obraId}/${uniqueFilename}`;
    
    const storageFile = bucket.file(storagePath);
    await storageFile.save(fileBuffer, {
      metadata: { contentType: file.type },
    });
    
    const archivoUrl = storageFile.publicUrl();

    const newRecord = {
      obraId,
      companyId, // Guardar el companyId para las reglas de seguridad
      nombre: nombreCompleto,
      rut,
      empresa,
      motivo,
      archivoUrl,
      storagePath,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await db.collection("controlAcceso").add(newRecord);

    return NextResponse.json({ success: true, message: "Registro de acceso guardado correctamente." });

  } catch (error: any) {
    console.error("[API /control-acceso/submit] Error:", error);
    return NextResponse.json({ error: "Error interno del servidor.", details: error.message }, { status: 500 });
  }
}
