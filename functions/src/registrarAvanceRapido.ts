import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

const AvanceSchema = z.object({
  obraId: z.string().min(1),
  actividadId: z.string().nullable().optional(),
  porcentaje: z.number().min(0).max(100),
  comentario: z.string().optional().default(""),
  fotos: z.array(z.string().url()).max(5).optional().default([]),
  visibleCliente: z.boolean().optional().default(true),
});

export const registrarAvanceRapido = onCall({ region: "southamerica-west1", cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "El usuario no está autenticado.");
  }

  const { uid, token } = request.auth;
  const displayName = token.name || token.email || "";

  const parsed = AvanceSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Los datos proporcionados son inválidos.", parsed.error.flatten());
  }

  const { obraId, actividadId, porcentaje, comentario, fotos, visibleCliente } = parsed.data;

  try {
    const db = getFirestore();
    const obraRef = db.collection("obras").doc(obraId);

    const avanceId = await db.runTransaction(async (tx) => {
      const obraSnap = await tx.get(obraRef);
      if (!obraSnap.exists) {
        throw new HttpsError("not-found", `La obra con ID ${obraId} no fue encontrada.`);
      }

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
        creadoPor: { uid, displayName },
      };
      tx.set(nuevoAvanceRef, avanceData);

      if (porcentaje > 0) {
        const currentData = obraSnap.data() || {};
        const avancePrevio = Number(currentData.avanceAcumulado || 0);
        const totalActividades = Number(currentData.totalActividades || 10); // Fallback a 10 si no existe
        const avancePonderadoDelDia = porcentaje / totalActividades;
        const nuevoAvanceAcumulado = Math.min(100, avancePrevio + avancePonderadoDelDia);

        tx.update(obraRef, {
          ultimaActualizacion: FieldValue.serverTimestamp(),
          avanceAcumulado: nuevoAvanceAcumulado,
        });
      } else {
        tx.update(obraRef, { ultimaActualizacion: FieldValue.serverTimestamp() });
      }

      return nuevoAvanceRef.id;
    });

    return { ok: true, id: avanceId };

  } catch (error) {
    logger.error("Error en registrarAvanceRapido:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Ocurrió un error inesperado al guardar el avance.");
  }
});
