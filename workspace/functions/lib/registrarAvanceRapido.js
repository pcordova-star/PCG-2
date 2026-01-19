"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrarAvanceRapido = void 0;
// workspace/functions/src/registrarAvanceRapido.ts
const functions = __importStar(require("firebase-functions"));
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const auth_1 = require("firebase-admin/auth");
const cors_1 = __importDefault(require("cors"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const adminApp = (0, firebaseAdmin_1.getAdminApp)();
const db = adminApp.firestore();
const corsHandler = (0, cors_1.default)({ origin: true });
const AvanceSchema = zod_1.z.object({
    obraId: zod_1.z.string().min(1),
    actividadId: zod_1.z.string().nullable().optional(),
    porcentaje: zod_1.z.coerce.number().min(0).max(100),
    comentario: zod_1.z.string().optional().default(""),
    fotos: zod_1.z.array(zod_1.z.string()).max(5).optional().default([]),
    visibleCliente: zod_1.z.coerce.boolean().optional().default(true),
});
function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
exports.registrarAvanceRapido = functions.region("us-central1").https.onRequest((req, res) => {
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
            const decodedToken = await (0, auth_1.getAuth)().verifyIdToken(token);
            const { uid } = decodedToken;
            const displayName = decodedToken.name || decodedToken.email || "";
            const parsed = AvanceSchema.safeParse(req.body);
            if (!parsed.success) {
                throw new functions.https.HttpsError("invalid-argument", "Los datos proporcionados son inválidos.", parsed.error.flatten());
            }
            const { obraId, actividadId, porcentaje, comentario, fotos, visibleCliente } = parsed.data;
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
                    fecha: firestore_1.FieldValue.serverTimestamp(),
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
                                ultimaActualizacion: firestore_1.FieldValue.serverTimestamp(),
                                avanceAcumulado: nuevoAvanceAcumulado,
                            });
                        }
                        else {
                            tx.update(obraRef, { ultimaActualizacion: firestore_1.FieldValue.serverTimestamp() });
                        }
                    }
                    else {
                        tx.update(obraRef, { ultimaActualizacion: firestore_1.FieldValue.serverTimestamp() });
                    }
                }
                else {
                    tx.update(obraRef, { ultimaActualizacion: firestore_1.FieldValue.serverTimestamp() });
                }
                return nuevoAvanceRef.id;
            });
            res.status(200).json({ ok: true, id: avanceId });
        }
        catch (error) {
            logger.error("Error en registrarAvanceRapido:", error);
            if (error.httpErrorCode) {
                res.status(error.httpErrorCode.status).json({ ok: false, error: error.code, details: error.message });
            }
            else {
                res.status(500).json({ ok: false, error: "INTERNAL_SERVER_ERROR", details: error.message });
            }
        }
    });
});
//# sourceMappingURL=registrarAvanceRapido.js.map