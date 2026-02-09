// src/app/api/control-acceso/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin from "@/server/firebaseAdmin";
import { z } from "zod";

const ConfirmSchema = z.object({
  evidenciaId: z.string().min(1),
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
     if (!admin.apps.length) {
      throw new Error("El servicio de backend no está configurado correctamente.");
    }
    const body = await req.json();
    const parsed = ConfirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "ID de evidencia inválido." }, { status: 400 });
    }
    
    const { evidenciaId } = parsed.data;
    
    const db = admin.firestore();
    const evidenciaRef = db.collection("registrosInduccionContextual").doc(evidenciaId);
    
    const snap = await evidenciaRef.get();
    if (!snap.exists) {
         return NextResponse.json({ error: "Registro de evidencia no encontrado." }, { status: 404 });
    }

    await evidenciaRef.update({
      fechaConfirmacion: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API /control-acceso/confirm] Error:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
