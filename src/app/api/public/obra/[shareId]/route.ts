import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ObraPublica = {
  id: string;
  nombre: string;
  cliente?: string;
  direccion?: string;
  estado?: string;
};

export async function GET(
  _req: Request,
  context: { params: { shareId: string } }
) {
  const { shareId } = context.params;

  if (!shareId) {
    return NextResponse.json(
      { ok: false, error: "MISSING_SHARE_ID" },
      { status: 400 }
    );
  }

  try {
    const db = getAdminDb();

    const snap = await db
      .collection("obras")
      .where("shareId", "==", shareId)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { ok: false, error: "OBRA_NOT_FOUND" },
        { status: 404 }
      );
    }

    const doc = snap.docs[0];
    const data = doc.data() as any;

    const obra: ObraPublica = {
      id: doc.id,
      nombre: data.nombre ?? "",
      cliente: data.cliente ?? "",
      direccion: data.direccion ?? "",
      estado: data.estado ?? "",
    };

    return NextResponse.json({ ok: true, obra }, { status: 200 });
  } catch (err: any) {
    console.error("[API public/obra] INTERNAL_ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
