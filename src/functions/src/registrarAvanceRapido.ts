// functions/src/registrarAvanceRapido.ts
import * as functions from 'firebase-functions';
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getAuth } from "firebase-admin/auth";
import cors from "cors";

// Definición para v1 onRequest
const corsHandler = cors({ origin: true });

// El schema en el backend debe coincidir con lo que envía el frontend.
const AvanceSchema = z.object({
    obraId: z.string().min(1),
    actividadId: z.string().min(1),
    porcentajeAvance: z.coerce.number().min(0).max(100.01),
    comentario: z.string().optional().default(""),
    fotos: z.array(z.string().url()).max(5).optional().default([]),
    visibleCliente: z.coerce.boolean().optional().default(true),
    // Nuevos campos para registro completo
    cantidadEjecutada: z.coerce.number(),
    unidad: z.string(),
    cantidadTotalActividad: z.coerce.number(),
    fechaAvance: z.string(), // YYYY-MM-DD
    actividadNombre: z.string(),
});


function escapeHtml(s: string): string {
  if (!s) return "";
  return s.replace(/[&<>"']/g, (m: string) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
}

// Se mantiene como Cloud Function v1 para asegurar que sea pública por defecto.
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
                logger.error("Error de validación de Zod:", parsed.error.flatten());
                res.status(400).json({ ok: false, error: "INVALID_ARGUMENT", details: parsed.error.flatten() });
                return;
            }

            const { 
                obraId, 
                actividadId, 
                porcentajeAvance,
                comentario, 
                fotos, 
                visibleCliente, 
                cantidadEjecutada, 
                cantidadTotalActividad,
                unidad 
            } = parsed.data;

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
                    porcentajeAvance,
                    comentario: escapeHtml(comentario),
                    fotos,
                    visibleCliente,
                    fecha: FieldValue.serverTimestamp(),
                    creadoPor: { uid, displayName: escapeHtml(displayName) },
                    cantidadEjecutada: cantidadEjecutada,
                    unidad: unidad,
                    tipoRegistro: "CANTIDAD",
                };
                
                tx.set(nuevoAvanceRef, avanceData);

                // Lógica de actualización del avance acumulado
                if (cantidadEjecutada > 0) {
                    const currentData = obraSnap.data() || {};
                    const avancePrevio = Number(currentData.avanceAcumulado || 0);
                    const totalActividades = Number(currentData.totalActividades || 1); // Fallback para evitar división por cero

                    if (totalActividades > 0 && cantidadTotalActividad > 0) {
                        const pesoActividad = 1 / totalActividades;
                        const avanceParcialActividad = (cantidadEjecutada / cantidadTotalActividad);
                        const avancePonderadoDelDia = avanceParcialActividad * pesoActividad * 100;
                        
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
            logger.error("Error en registrarAvanceRapido:", { message: error.message, code: error.code, details: error.details });
            if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
                res.status(401).json({ ok: false, error: "UNAUTHENTICATED", details: "Token inválido o expirado." });
            } else {
                res.status(500).json({ ok: false, error: "INTERNAL_SERVER_ERROR", details: error.message });
            }
        }
    });
});
