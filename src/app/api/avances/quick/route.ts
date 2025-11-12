import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Esquema de entrada (JSON). Fotos llegan como URLs ya subidas a Storage.
const AvanceSchema = z.object({
  obraId: z.string().min(1),
  porcentaje: z.number().min(0).max(100),
  comentario: z.string().optional().default(""),
  fotos: z.array(z.string().url()).optional().default([]),
  visibleCliente: z.boolean().optional().default(true),
});

async function getUserFromAuthHeader() {
  const adminApp = getAdminApp();
  const auth = getAuth(adminApp);
  
  // Espera Authorization: Bearer <ID_TOKEN>
  const authHeader = headers().get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  try {
      const decoded = await auth.verifyIdToken(token);
      return decoded; // { uid, email, ... }
  } catch (error) {
      console.warn("Invalid auth token received:", error);
      return null;
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromAuthHeader();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = AvanceSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 });
    }
    const { obraId, porcentaje, comentario, fotos, visibleCliente } = parsed.data;

    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    // Verifica que la obra exista
    const obraRef = db.collection("obras").doc(obraId);
    const obraSnap = await obraRef.get();
    if (!obraSnap.exists) {
      return NextResponse.json({ ok: false, error: "OBRA_NOT_FOUND" }, { status: 404 });
    }

    // Documento de avance
    const avanceData = {
      obraId,
      porcentajeAvance: porcentaje,
      comentario,
      fotos,
      visibleCliente,
      fecha: FieldValue.serverTimestamp(),
      creadoPor: {
        uid: user.uid,
        displayName: user.name || user.email || "",
      },
    };

    const avancesRef = obraRef.collection("avancesDiarios");
    const write = await avancesRef.add(avanceData);

    // (Opcional) actualizar agregados de programación aquí si corresponde
    await db.runTransaction(async (transaction) => {
        const obraDocTx = await transaction.get(obraRef);
        if (!obraDocTx.exists) {
            throw "La obra no existe.";
        }
        const currentData = obraDocTx.data() || {};
        
        const avancePrevio = currentData.avanceAcumulado || 0;
        const nuevoAvanceAcumulado = Math.min(100, avancePrevio + porcentaje);

        transaction.update(obraRef, {
            ultimaActualizacion: FieldValue.serverTimestamp(),
            avanceAcumulado: nuevoAvanceAcumulado,
        });
    });

    return NextResponse.json({ ok: true, id: write.id }, { status: 201 });
  } catch (err: any) {
    console.error("[API avances/quick] Unexpected Error:", err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
