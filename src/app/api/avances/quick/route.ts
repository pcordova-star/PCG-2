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
    console.warn("[avances/quick] Invalid auth token:", error);
    return null;
  }
}

export async function POST(req: Request) {
  console.log("[avances/quick] POST recibido");

  try {
    // 1) Autenticación
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      console.warn("[avances/quick] sin usuario autenticado");
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    console.log("[avances/quick] user.uid =", user.uid);

    // 2) Parseo del body
    const json = await req.json().catch((e) => {
      console.error("[avances/quick] error leyendo JSON:", e);
      return null;
    });

    if (!json) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: "Body vacío o inválido" },
        { status: 400 }
      );
    }

    const parsed = AvanceSchema.safeParse(json);
    if (!parsed.success) {
      console.warn("[avances/quick] BAD_REQUEST", parsed.error.flatten());
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      obraId,
      actividadId,
      porcentaje,
      comentario,
      fotos,
      visibleCliente,
    } = parsed.data;

    console.log("[avances/quick] payload validado", {
      obraId,
      actividadId,
      porcentaje,
      visibleCliente,
      fotosCount: fotos.length,
    });

    // 3) Firestore simple (SIN transacción para probar)
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);
    const obraRef = db.collection("obras").doc(obraId);

    console.log("[avances/quick] leyendo obra", obraId);
    const obraSnap = await obraRef.get();

    if (!obraSnap.exists) {
      console.warn("[avances/quick] OBRA_NOT_FOUND", obraId);
      return NextResponse.json(
        { ok: false, error: "OBRA_NOT_FOUND" },
        { status: 404 }
      );
    }

    const obraData = obraSnap.data() || {};
    const currentUid = user.uid;

    // ----- permisos MUY explícitos -----
    const miembrosRaw = obraData.miembros ?? [];
    let esMiembro = false;

    if (Array.isArray(miembrosRaw)) {
      esMiembro = miembrosRaw.some((m: any) => {
        if (!m) return false;
        if (typeof m === "string") return m === currentUid;
        if (typeof m === "object") {
          return m.uid === currentUid || m.id === currentUid;
        }
        return false;
      });
    }

    const esCreador =
      obraData.creadoPorUid === currentUid ||
      obraData.ownerUid === currentUid ||
      obraData.creadoPor?.uid === currentUid;

    if (!esCreador && !esMiembro) {
      console.warn("[avances/quick] PERMISSION_DENIED", {
        obraId,
        currentUid,
        creadoPorUid: obraData.creadoPorUid,
        ownerUid: obraData.ownerUid,
        creadoPor: obraData.creadoPor,
        miembrosRaw,
      });
      return NextResponse.json(
        { ok: false, error: "PERMISSION_DENIED" },
        { status: 403 }
      );
    }
    // ------------------------------------

    console.log("[avances/quick] permisos OK, creando avance");

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
        uid: currentUid,
        displayName: (user as any).name || (user as any).email || "",
      },
    };

    await nuevoAvanceRef.set(avanceData);

    // Actualizar resumen de obra (sin transacción)
    const avancePrevio = Number(obraData.avanceAcumulado || 0);
    const totalActividades = Number(obraData.totalActividades || 0);
    const avancePonderadoDelDia =
      porcentaje > 0 && totalActividades > 0
        ? porcentaje / totalActividades
        : 0;
    const nuevoAvanceAcumulado = Math.min(
      100,
      avancePrevio + avancePonderadoDelDia
    );

    console.log("[avances/quick] actualizando obra", {
      avancePrevio,
      avancePonderadoDelDia,
      nuevoAvanceAcumulado,
    });

    await obraRef.update({
      ultimaActualizacion: FieldValue.serverTimestamp(),
      avanceAcumulado: nuevoAvanceAcumulado,
    });

    console.log("[avances/quick] OK, avanceId =", nuevoAvanceRef.id);

    return NextResponse.json(
      { ok: true, id: nuevoAvanceRef.id },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[avances/quick] ERROR NO CONTROLADO", err);

    // Si son nuestros errores conocidos
    if (err?.message === "OBRA_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "OBRA_NOT_FOUND" }, { status: 404 });
    }
    if (err?.message === "PERMISSION_DENIED") {
      return NextResponse.json({ ok: false, error: "PERMISSION_DENIED" }, { status: 403 });
    }

    // Cualquier otra cosa: log + detalle
    const code = (err as any)?.code ?? null;
    const message = err?.message ?? String(err);

    return NextResponse.json(
      {
        ok: false,
        error: "INTERNAL_ERROR",
        code,
        details: message,
      },
      { status: 500 }
    );
  }
}
