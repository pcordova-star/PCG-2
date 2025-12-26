// functions/src/registrarAvanceRapido.ts
import * as functions from 'firebase-functions';
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getAuth } from "firebase-admin/auth";
import cors from "cors";

// Definición para v1 onRequest
const corsHandler = cors({ origin: true });

const AvanceSchema = z.object({
    obraId: z.string().min(1),
    actividadId: z.string().min(1), // Ahora es requerido
    porcentaje: z.coerce.number().min(0).max(100),
    comentario: z.string().optional().default(""),
    fotos: z.array(z.string()).max(5).optional().default([]),
    visibleCliente: z.coerce.boolean().optional().default(true),
    // Nuevos campos para registro completo
    cantidadEjecutada: z.coerce.number(),
    unidad: z.string(),
    cantidadTotalActividad: z.coerce.number(),
    fechaAvance: z.string(),
    actividadNombre: z.string(),
});


function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (m: string) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
}

// Convertir a Cloud Function v1 para mantener compatibilidad con onRequest y auth manual
export const registrarAvanceRapido = functions.region("southamerica-west1").https.onRequest((req, res) => {
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
                res.status(401).json({ ok: false, error: "UNAUTHENTICATED", details: "Bearer token faltante o malformado." });
                return;
            }
            const token = authHeader.split(' ')[1];
            const decodedToken = await getAuth().verifyIdToken(token);
            const { uid } = decodedToken;
            const displayName = decodedToken.name || decodedToken.email || "";

            const parsed = AvanceSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ ok: false, error: "INVALID_ARGUMENT", details: parsed.error.flatten() });
                return;
            }

            const { obraId, actividadId, porcentaje, comentario, fotos, visibleCliente, cantidadEjecutada, unidad } = parsed.data;

            const db = getFirestore();
            const obraRef = db.collection("obras").doc(obraId);

            const avanceId = await db.runTransaction(async (tx) => {
                const obraSnap = await tx.get(obraRef);
                if (!obraSnap.exists) {
                    throw new Error(`La obra con ID ${obraId} no fue encontrada.`);
                }
                
                const avancesRef = obraRef.collection("avancesDiarios");
                const nuevoAvanceRef = avancesRef.doc();

                const avanceData = {
                    obraId,
                    actividadId,
                    porcentajeAvance: porcentaje,
                    comentario: escapeHtml(comentario),
                    fotos,
                    visibleCliente,
                    fecha: FieldValue.serverTimestamp(),
                    creadoPor: { uid, displayName: escapeHtml(displayName) },
                    // Nuevos campos para persistir
                    cantidadEjecutada: cantidadEjecutada,
                    unidad: unidad,
                };
                
                tx.set(nuevoAvanceRef, avanceData);

                // La lógica de actualización del avance acumulado en la obra se ha movido
                // a un trigger de Firestore para mayor consistencia, o se puede calcular
                // en el cliente al leer los avances. Esto simplifica la función de registro.
                tx.update(obraRef, { ultimaActualizacion: FieldValue.serverTimestamp() });

                return nuevoAvanceRef.id;
            });

            res.status(200).json({ ok: true, id: avanceId });

        } catch (error: any) {
            logger.error("Error en registrarAvanceRapido:", error);
            if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
                res.status(401).json({ ok: false, error: "UNAUTHENTICATED", details: "Token inválido o expirado." });
            } else if (error.httpErrorCode) { // Para errores HttpsError
                res.status(error.httpErrorCode.status).json({ ok: false, error: error.code, details: error.message });
            }
            else {
                res.status(500).json({ ok: false, error: "INTERNAL_SERVER_ERROR", details: error.message });
            }
        }
    });
});
