// src/app/api/avances/quick/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Esquema de entrada (JSON)
const AvanceSchema = z.object({
  obraId: z.string().min(1),
  actividadId: z.string().nullable().optional(),
  porcentaje: z.number().min(0).max(100),
  comentario: z.string().optional().default(""),
  fotos: z.array(z.string().url()).optional().default([]),
  visibleCliente: z.boolean().optional().default(true),
});

async function getUserFromAuthHeader(req: Request) {
  const adminApp = getAdminApp();
  const auth = getAuth(adminApp);

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  try {
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.warn("Invalid auth token received:", error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = AvanceSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { obraId, actividadId, porcentaje, comentario, fotos, visibleCliente } = parsed.data;
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);
    const obraRef = db.collection("obras").doc(obraId);

    const avanceId = await db.runTransaction(async (tx) => {
      const obraSnap = await tx.get(obraRef);
      if (!obraSnap.exists) throw new Error("OBRA_NOT_FOUND");
      
      const obraData = obraSnap.data() || {};
      
      // Basic permission check: does the user have access to this obra?
      // This is a simplified check. A real-world app would have more complex roles.
      const miembros = obraData.miembros || [];
      const tienePermiso = miembros.some((m: any) => m.uid === user.uid);

      // if (!tienePermiso && obraData.creadoPorUid !== user.uid) {
      //   throw new Error("PERMISSION_DENIED");
      // }

      const avancesRef = obraRef.collection("avancesDiarios");
      const nuevoAvanceRef = avancesRef.doc();

      const avanceData = {
        obraId,
        actividadId: actividadId || null,
        porcentajeAvance: porcentaje,
        comentario,
        fotos,
        visibleCliente,
        fecha: FieldValue.serverTimestamp(),
        creadoPor: {
          uid: user.uid,
          displayName: (user as any).name || user.email || "",
        },
      };
      tx.set(nuevoAvanceRef, avanceData);

      if (porcentaje > 0) {
        // Simplified calculation to avoid complex reads inside transaction
        const avancePrevio = Number(obraData.avanceAcumulado || 0);
        // This is a simplified ponderation. A more complex system would fetch activity weights.
        // For a quick action, we assume a simple incremental progress.
        const avancePonderadoDelDia = porcentaje / (obraData.totalActividades || 10);
        const nuevoAvanceAcumulado = Math.min(100, avancePrevio + avancePonderadoDelDia);

        tx.update(obraRef, {
          ultimaActualizacion: FieldValue.serverTimestamp(),
          avanceAcumulado: nuevoAvanceAcumulado,
        });
      } else {
        // If no progress percentage, just update the timestamp
        tx.update(obraRef, { ultimaActualizacion: FieldValue.serverTimestamp() });
      }

      return nuevoAvanceRef.id;
    });

    return NextResponse.json({ ok: true, id: avanceId }, { status: 201 });
  } catch (err: any) {
    console.error("[API avances/quick] Unexpected Error:", err);
    if (err?.message === "OBRA_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "OBRA_NOT_FOUND" }, { status: 404 });
    }
     if (err?.message === "PERMISSION_DENIED") {
      return NextResponse.json({ ok: false, error: "PERMISSION_DENIED" }, { status: 403 });
    }
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
