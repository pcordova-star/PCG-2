import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebaseAdmin";

export async function GET(
  _req: Request,
  { params }: { params: { shareId: string } }
) {
  const { shareId } = params;
  if (!shareId) return NextResponse.json({ error: "Missing shareId" }, { status: 400 });

  try {
    const db = dbAdmin();

    // Busca obra por shareId público
    const snap = await db
      .collection("obras")
      .where("clientePanel.enabled", "==", true)
      .where("clientePanel.shareId", "==", shareId)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const obraDoc = snap.docs[0];
    const obraId = obraDoc.id;
    const obra = obraDoc.data() || {};

    // Lee actividades
    const actsSnap = await db.collection("obras").doc(obraId).collection("actividades").get();
    const actividades = actsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<
      { precio?: number; estado?: string }
    >;

    // Lee avances visibles para cliente (últimos 5)
    const avSnap = await db
      .collection("obras").doc(obraId).collection("avancesDiarios")
      .where("visibleCliente", "==", true)
      .orderBy("fecha", "desc")
      .limit(5)
      .get();

    const ultimosAvances = avSnap.docs.map((d) => {
      const x = d.data() as any;
      const fechaISO =
        x.fecha?.toDate?.() ? x.fecha.toDate().toISOString() :
        (typeof x.fecha === "string" ? x.fecha : null);
      return {
        fechaISO,
        porcentaje: Number(x.porcentaje ?? 0),
        comentario: x.comentario ?? null,
        imagenes: Array.isArray(x.imagenUrls) ? x.imagenUrls : [],
      };
    });

    // Indicadores
    const totalActs = actividades.length;
    const completadas = actividades.filter((a) => a.estado === "completada").length;

    const precioTotal = actividades.reduce((acc, a) => acc + (Number(a.precio) || 0), 0);
    let avanceAcumulado = 0;

    // Si existiera % por actividad, aquí podrías usar progresoActividad; de momento, fallback por avances diarios visibles
    if (precioTotal > 0) {
      // TODO: si hay progreso por actividad, calcular ponderado real
      // fallback => 0 hasta que haya progreso por actividad
      avanceAcumulado = 0;
    } else {
      // promedio simple de avances visibles
      const proms = ultimosAvances.map((a) => a.porcentaje).filter((n) => Number.isFinite(n));
      avanceAcumulado = proms.length ? (proms.reduce((a, b) => a + b, 0) / proms.length) : 0;
    }

    const ultimaActualizacionISO = ultimosAvances.length ? ultimosAvances[0].fechaISO : null;

    return NextResponse.json({
      obra: {
        nombre: obra.nombreFaena ?? "N/D",
        direccion: obra.direccion ?? "N/D",
        mandante: obra.mandanteRazonSocial ?? "N/D",
        contacto: obra.contacto ?? null,
      },
      indicadores: {
        avanceAcumulado: Number.isFinite(avanceAcumulado) ? Number(avanceAcumulado) : 0,
        ultimaActualizacionISO,
        actividades: { programadas: totalActs, completadas },
      },
      ultimosAvances,
    }, { status: 200, headers: { "Cache-Control": "private, max-age=60" } });

  } catch (err: any) {
    console.error("[api/public/obra] GET error:", err?.message || err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
