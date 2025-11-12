"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrarAvanceRapido = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const AvanceSchema = zod_1.z.object({
    obraId: zod_1.z.string().min(1),
    actividadId: zod_1.z.string().nullable().optional(),
    porcentaje: zod_1.z.number().min(0).max(100),
    comentario: zod_1.z.string().optional().default(""),
    fotos: zod_1.z.array(zod_1.z.string().url()).max(5).optional().default([]),
    visibleCliente: zod_1.z.boolean().optional().default(true),
});
exports.registrarAvanceRapido = (0, https_1.onCall)({ region: "southamerica-west1", cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "El usuario no está autenticado.");
    }
    const { uid, token } = request.auth;
    const displayName = token.name || token.email || "";
    const parsed = AvanceSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Los datos proporcionados son inválidos.", parsed.error.flatten());
    }
    const { obraId, actividadId, porcentaje, comentario, fotos, visibleCliente } = parsed.data;
    try {
        const db = (0, firestore_1.getFirestore)();
        const obraRef = db.collection("obras").doc(obraId);
        const avanceId = await db.runTransaction(async (tx) => {
            const obraSnap = await tx.get(obraRef);
            if (!obraSnap.exists) {
                throw new https_1.HttpsError("not-found", `La obra con ID ${obraId} no fue encontrada.`);
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
                fecha: firestore_1.FieldValue.serverTimestamp(),
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
                    ultimaActualizacion: firestore_1.FieldValue.serverTimestamp(),
                    avanceAcumulado: nuevoAvanceAcumulado,
                });
            }
            else {
                tx.update(obraRef, { ultimaActualizacion: firestore_1.FieldValue.serverTimestamp() });
            }
            return nuevoAvanceRef.id;
        });
        return { ok: true, id: avanceId };
    }
    catch (error) {
        logger.error("Error en registrarAvanceRapido:", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "Ocurrió un error inesperado al guardar el avance.");
    }
});
//# sourceMappingURL=registrarAvanceRapido.js.map