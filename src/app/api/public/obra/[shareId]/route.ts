// src/app/api/public/obra/[shareId]/route.ts
import { NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: {
    shareId: string;
  };
};

export async function GET(_req: Request, { params }: RouteParams) {
  const { shareId } = params;

  if (!shareId) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", details: "Falta shareId" },
      { status: 400 }
    );
  }

  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    // Busca la obra por el campo público de compartir (ajusta el nombre si es distinto)
    const snap = await db
      .collection("obras")
      .where("shareId", "==", shareId)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const doc = snap.docs[0];
    const data = doc.data();

    // 🔒 Filtra solo lo que quieras exponer públicamente
    const publicData = {
      id: doc.id,
      nombre: data.nombre ?? "",
      codigo: data.codigo ?? "",
      ubicacion: data.ubicacion ?? "",
      cliente: data.cliente ?? "",
      // agrega / quita campos públicos aquí
      avanceAcumulado: data.avanceAcumulado ?? 0,
    };

    return NextResponse.json(
      { ok: true, obra: publicData },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[API public/obra] Error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: "INTERNAL_ERROR",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
