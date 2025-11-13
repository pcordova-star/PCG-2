import { https, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import * as functions from "firebase-functions";
import * as cors from "cors";
import { getAuth } from "firebase-admin/auth";

const corsHandler = cors({
  origin: true, // acepta cualquier origen (útil mientras desarrollas)
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});

const AvanceSchema = z.object({
  obraId: z.string().min(1),
  actividadId: z.string().nullable().optional(),

  // 👇 Esto convierte string a número automáticamente (por ejemplo "20" → 20)
  porcentaje: z.coerce.number().min(0).max(100),

  comentario: z.string().optional().default(""),

  // 👇 Por ahora no validamos que la foto sea URL perfecta, solo texto
  fotos: z.array(z.string()).max(5).optional().default([]),

  // 👇 Acepta "true"/"false", 1/0, etc. y los convierte a boolean
  visibleCliente: z.coerce.boolean().optional().default(true),

  creadoPorNombre: z.string().optional(),
});



function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
}

export const registrarAvanceRapido = functions
  .region("southamerica-west1")
  .https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }
      
      if (req.method !== "POST") {
        res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
        return;
      }

      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          throw new HttpsError("unauthenticated", "El usuario no está autenticado.");
        }
        const token = authHeader.split(" ")[1];
        const decodedToken = await getAuth().verifyIdToken(token);
        const { uid } = decodedToken;
        const displayName = req.body.creadoPorNombre || decodedToken.name || decodedToken.email || "";

        const parsed = AvanceSchema.safeParse(req.body);
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

          const obraData = obraSnap.data() || {};
          const miembros = obraData.miembros || [];
          const tienePermiso = miembros.some((m: any) => m.uid === uid) || obraData.creadoPorUid === uid;

          if (!tienePermiso && obraData.creadoPorUid !== uid) {
             // Comentado para no bloquear en desarrollo
             // throw new HttpsError("permission-denied", "No tienes permiso para registrar avances en esta obra.");
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
            
            const avancePonderadoDelDia = totalActividades > 0 ? porcentaje / totalActividades : 0;

            if (avancePonderadoDelDia > 0 && !isNaN(avancePonderadoDelDia)) {
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
        
        // El envío de correo puede ser lento, lo hacemos fuera de la transacción.
        try {
            const obraSnapForMail = await getFirestore().collection("obras").doc(obraId).get();
            const obraDataForMail: any = obraSnapForMail.data() || {};
            const obraNombre = obraDataForMail.nombreFaena || obraDataForMail.nombre || `Obra ${obraId}`;
            const clienteEmail = obraDataForMail?.cliente?.email || obraDataForMail?.clienteEmail || obraDataForMail?.mandante?.email || null;
      
            if (visibleCliente && clienteEmail) {
              await getFirestore().collection("mail").add({
                to: [clienteEmail],
                message: {
                  subject: `Nuevo avance diario — ${obraNombre}`,
                  html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:640px;margin:auto;"><h2 style="margin:0 0 12px 0;">Avance Diario Registrado</h2><p><strong>Obra:</strong> ${escapeHtml(obraNombre)}</p><p><strong>Porcentaje del día:</strong> ${Number(porcentaje)}%</p>${comentario ? `<p><strong>Comentario:</strong> ${escapeHtml(String(comentario))}</p>` : ""}${Array.isArray(fotos) && fotos.length ? `<div style="margin-top:12px;">${fotos.slice(0,4).map(u => `<a href="${u}" target="_blank" style="display:inline-block;margin-right:8px;">Foto</a>`).join(" · ")}${fotos.length > 4 ? `<div style="margin-top:6px;">(+${fotos.length - 4} fotos adicionales)</div>` : ""}</div>` : ""}<hr style="margin:16px 0;border:none;border-top:1px solid #eee" /><p style="color:#555;margin:0;">ID Obra: ${escapeHtml(obraId)}</p></div>`,
                },
              });
            }
          } catch (mailErr) {
            logger.error("[registrarAvanceRapido] Error creando doc de mail:", mailErr);
          }

        res.status(200).json({ ok: true, id: avanceId });

      } catch (error: any) {
        logger.error("Error en registrarAvanceRapido:", error);
        if (error instanceof HttpsError) {
            res.status(error.httpErrorCode.status).json({ ok: false, error: error.code, details: error.message });
        } else {
            res.status(500).json({ ok: false, error: "INTERNAL_SERVER_ERROR", details: error.message });
        }
      }
    });
  });
