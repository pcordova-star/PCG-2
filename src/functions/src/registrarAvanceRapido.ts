
// functions/src/registrarAvanceRapido.ts
import * as functions from 'firebase-functions';
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getAuth } from "firebase-admin/auth";
import cors from "cors";

const corsHandler = cors({ origin: true });

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

// Convertido a Cloud Function v1 para mantener compatibilidad
export const registrarAvanceRapido = functions.region("us-central1").https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }
        if (req.method !== 'POST') {
            res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
            return;
        }

        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new functions.https.HttpsError('unauthenticated', 'El usuario no está autenticado.');
            }
            const token = authHeader.split(' ')[1];
            const decodedToken = await getAuth().verifyIdToken(token);
            const { uid } = decodedToken;
            const displayName = decodedToken.name || decodedToken.email || "";

            const parsed = AvanceSchema.safeParse(req.body);
            if (!parsed.success) {
                throw new functions.https.HttpsError("invalid-argument", "Los datos proporcionados son inválidos.", parsed.error.flatten());
            }

            const { obraId, actividadId, porcentaje, comentario, fotos, visibleCliente } = parsed.data;

            const db = getFirestore();
            const obraRef = db.collection("obras").doc(obraId);

            const avanceId = await db.runTransaction(async (tx) => {
                const obraSnap = await tx.get(obraRef);
                if (!obraSnap.exists) {
                    throw new functions.https.HttpsError("not-found", `La obra con ID ${obraId} no fue encontrada.`);
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
                    const totalActividades = Number(currentData.totalActividades || 1);
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

            res.status(200).json({ ok: true, id: avanceId });

        } catch (error: any) {
            logger.error("Error en registrarAvanceRapido:", error);
            if (error.httpErrorCode) {
                res.status(error.httpErrorCode.status).json({ ok: false, error: error.code, details: error.message });
            } else {
                res.status(500).json({ ok: false, error: "INTERNAL_SERVER_ERROR", details: error.message });
            }
        }
    });
});
