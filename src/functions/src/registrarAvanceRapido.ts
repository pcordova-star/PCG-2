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
  creadoPorNombre: z.string().optional(),
});

// Utilidad simple para sanear HTML
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
}

export const registrarAvanceRapido = onCall({ region: "southamerica-west1", cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "El usuario no está autenticado.");
  }

  const { uid, token } = request.auth;
  const displayName = request.data.creadoPorNombre || token.name || token.email || "";

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
      
      const obraData = obraSnap.data() || {};
      const miembros = obraData.miembros || [];
      const tienePermiso = miembros.some((m: any) => m.uid === uid) || obraData.creadoPorUid === uid;

      if (!tienePermiso) {
        throw new HttpsError("permission-denied", "No tienes permiso para registrar avances en esta obra.");
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
        creadoPor: { uid, displayName: escapeHtml(displayName) },
      };
      tx.set(nuevoAvanceRef, avanceData);

      if (porcentaje > 0) {
        const currentData = obraSnap.data() || {};
        const avancePrevio = Number(currentData.avanceAcumulado || 0);
        const totalActividades = Number(currentData.totalActividades);
        
        // Evitar división por cero o NaN
        const avancePonderadoDelDia = totalActividades > 0 ? porcentaje / totalActividades : 0;

        if (avancePonderadoDelDia > 0) {
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

      return nuevoAvanceRef.id;
    });

    // Después de la transacción exitosa y antes del return
    try {
      // Recuperar datos de la obra para el correo
      const obraSnapForMail = await getFirestore().collection("obras").doc(obraId).get();
      const obraDataForMail: any = obraSnapForMail.data() || {};
      const obraNombre =
        obraDataForMail.nombreFaena || obraDataForMail.nombre || `Obra ${obraId}`;

      const clienteEmail =
        obraDataForMail?.cliente?.email ||
        obraDataForMail?.clienteEmail ||
        obraDataForMail?.mandante?.email ||
        null;

      // Respetar la visibilidad al cliente
      if (visibleCliente && clienteEmail) {
        await getFirestore().collection("mail").add({
          to: [clienteEmail],
          message: {
            subject: `Nuevo avance diario — ${obraNombre}`,
            html: `
              <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:640px;margin:auto;">
                <h2 style="margin:0 0 12px 0;">Avance Diario Registrado</h2>
                <p><strong>Obra:</strong> ${escapeHtml(obraNombre)}</p>
                <p><strong>Porcentaje del día:</strong> ${Number(porcentaje)}%</p>
                ${comentario ? `<p><strong>Comentario:</strong> ${escapeHtml(String(comentario))}</p>` : ""}
                ${
                  Array.isArray(fotos) && fotos.length
                    ? `<div style="margin-top:12px;">
                         ${fotos.slice(0,4).map(u => `<a href="${u}" target="_blank" style="display:inline-block;margin-right:8px;">Foto</a>`).join(" · ")}
                         ${fotos.length > 4 ? `<div style="margin-top:6px;">(+${fotos.length - 4} fotos adicionales)</div>` : ""}
                       </div>`
                    : ""
                }
                <hr style="margin:16px 0;border:none;border-top:1px solid #eee" />
                <p style="color:#555;margin:0;">ID Obra: ${escapeHtml(obraId)}</p>
              </div>
            `,
          },
        });
      }
    } catch (mailErr) {
      logger.error("[registrarAvanceRapido] Error creando doc de mail:", mailErr);
      // No interrumpir el flujo principal por fallo de email
    }

    return { ok: true, id: avanceId };

  } catch (error) {
    logger.error("Error en registrarAvanceRapido:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Ocurrió un error inesperado al guardar el avance.");
  }
});
