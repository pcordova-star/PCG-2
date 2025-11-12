import { NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  const adminApp = getAdminApp();
  const auth = getAuth(adminApp);
  const db = getFirestore(adminApp);

  try {
    // 1. Autenticación
    const token = req.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "No autorizado: Token no proporcionado" },
        { status: 401 }
      );
    }
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // 2. Validación del Body
    const body = await req.json();
    const { obraId, porcentaje, comentario, fotos, visibleCliente } = body;

    if (!obraId || porcentaje === undefined) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: obraId y porcentaje" },
        { status: 400 }
      );
    }

    const numPorcentaje = Number(porcentaje);
    if (isNaN(numPorcentaje) || numPorcentaje < 0 || numPorcentaje > 100) {
        return NextResponse.json({ error: "Porcentaje inválido" }, { status: 400 });
    }

    // 3. Validación de Permisos (simplificado)
    // En una app real, verificarías si el UID tiene rol en la obra.
    const obraRef = db.collection("obras").doc(obraId);
    const obraDoc = await obraRef.get();
    if (!obraDoc.exists) {
      return NextResponse.json({ error: "Obra no encontrada" }, { status: 404 });
    }
    // const obraData = obraDoc.data();
    // if (!obraData.miembros || !obraData.miembros[uid]) {
    //    return NextResponse.json({ error: "No tienes permisos sobre esta obra" }, { status: 403 });
    // }

    // 4. Crear el nuevo documento de avance
    const avancesRef = obraRef.collection("avancesDiarios");
    const nuevoAvance = {
      obraId,
      porcentajeAvance: numPorcentaje,
      comentario: comentario || "",
      fotos: fotos || [],
      visibleCliente: visibleCliente !== false, // default true
      fecha: FieldValue.serverTimestamp(),
      creadoPor: {
        uid,
        displayName: decodedToken.name || decodedToken.email,
      },
    };
    const avanceDocRef = await avancesRef.add(nuevoAvance);

    // 5. Actualizar agregados en la obra principal (en transacción)
    let resumenActualizado: any = {};
    await db.runTransaction(async (transaction) => {
        const obraDocTx = await transaction.get(obraRef);
        if (!obraDocTx.exists) {
            throw "La obra no existe.";
        }
        const currentData = obraDocTx.data() || {};
        
        // El avance acumulado debería ser más complejo.
        // Por ahora, solo sumamos el del día, con un cap de 100.
        const avancePrevio = currentData.avanceAcumulado || 0;
        const nuevoAvanceAcumulado = Math.min(100, avancePrevio + numPorcentaje);

        transaction.update(obraRef, {
            ultimaActualizacion: FieldValue.serverTimestamp(),
            avanceAcumulado: nuevoAvanceAcumulado,
        });

        resumenActualizado = {
            avanceAcumulado: nuevoAvanceAcumulado
        };
    });


    return NextResponse.json({
      ok: true,
      avanceId: avanceDocRef.id,
      resumenActualizado,
    });

  } catch (error: any) {
    console.error("[API /api/avances/quick] Error:", error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: "Token expirado, por favor inicie sesión de nuevo." }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}
