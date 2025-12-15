// functions/src/registrarAvanceRapido.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

const AvanceSchema = z.object({
    obraId: z.string().min(1),
    actividadId: z.string().nullable().optional(),
    porcentaje: z.coerce.number().min(0).max(100),
    comentario: z.string().optional().default(""),
    fotos: z.array(z.string()).max(5).optional().default([]),
    visibleCliente: z.coerce.boolean().optional().default(true),
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (m: string) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
}

export const registrarAvanceRapido = onCall(
  {
    region: "southamerica-west1",
    cpu: 1,
    memory: "256MiB",
    timeoutSeconds: 60,
    cors: true
  },
  async (request) => {
    // 1. Autenticación (manejada automáticamente por onCall v2)
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "El usuario no está autenticado.");
    }

    try {
      const { uid, token } = request.auth;
      const displayName = token.name || token.email || "";

      // 2. Validación de datos de entrada
      const parsed = AvanceSchema.safeParse(request.data);
      if (!parsed.success) {
        throw new HttpsError("invalid-argument", "Los datos proporcionados son inválidos.", parsed.error.flatten());
      }

      const { obraId, actividadId, porcentaje, comentario, fotos, visibleCliente } = parsed.data;

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
          comentario: escapeHtml(comentario),
          fotos,
          visibleCliente,
          fecha: FieldValue.serverTimestamp(),
          creadoPor: { uid, displayName: escapeHtml(displayName) },
        };
        tx.set(nuevoAvanceRef, avanceData);

        if (porcentaje > 0) {
            const currentData = obraSnap.data() || {};
            const avancePrevio = Number(currentData.avanceAcumulado || 0);
            const totalActividades = Number(currentData.totalActividades || 1); // Evitar división por cero
            
            if (totalActividades > 0) {
                const avancePonderadoDelDia = porcentaje / totalActividades;
                if (!isNaN(avancePonderadoDelDia) && avancePonderadoDelDia > 0) {
                    const nuevoAvanceAcumulado = Math.min(100, avancePrevio + avancePonderadoDelDia);
                    tx.update(obraRef, {
                        ultimaActualizacion: FieldValue.serverTimestamp(),
                        avanceAcumulado: nuevoAvanceAcumulado,
                    });
                } else {
                     tx.update(obraRef, { ultimaActualizacion: FieldValue.serverTimestamp() });
                }
            } else {
                tx.update(obraRef, { ultimaActualizacion: FieldValue.serverTimestamp() });
            }
        } else {
          tx.update(obraRef, { ultimaActualizacion: FieldValue.serverTimestamp() });
        }

        return nuevoAvanceRef.id;
      });

      return { ok: true, id: avanceId };

    } catch (error: any) {
      logger.error("Error en registrarAvanceRapido:", error);
      if (error instanceof HttpsError) {
          throw error;
      }
      throw new HttpsError("internal", "Ocurrió un error inesperado al registrar el avance.", error.message);
    }
  }
);
