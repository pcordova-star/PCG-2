"use strict";
// workspace/functions/src/distributeNoticiaAlert.ts
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.distributeNoticiaAlert = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const adminApp = (0, firebaseAdmin_1.getAdminApp)();
const db = adminApp.firestore();
exports.distributeNoticiaAlert = functions
    .region("us-central1")
    .firestore.document("noticiasExternas/{noticiaId}/analisisIA/{analisisId}")
    .onCreate(async (snap, context) => {
    const { noticiaId } = context.params;
    const analisisData = snap.data();
    if (!analisisData) {
        logger.warn(`[${noticiaId}] El documento de análisis está vacío. No se puede distribuir.`);
        return;
    }
    logger.info(`[${noticiaId}] Distribuyendo alerta de noticia a las empresas.`);
    try {
        const companiesSnap = await db.collection('companies').where('activa', '==', true).get();
        if (companiesSnap.empty) {
            logger.warn(`[${noticiaId}] No hay empresas activas para notificar.`);
            return;
        }
        const batch = db.batch();
        companiesSnap.forEach(companyDoc => {
            const companyId = companyDoc.id;
            // Para el MVP, distribuimos a todos. En el futuro, aquí se aplicaría la lógica de filtro.
            const alertaRef = db.collection('alertasNoticias').doc();
            batch.set(alertaRef, {
                noticiaId,
                analisisId: snap.id,
                companyId,
                rolDestino: analisisData.entidadesPcgImpactadas || ['admin_empresa'],
                estado: 'pendiente',
                esCritica: analisisData.esCritica || false,
                fechaGeneracion: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        await batch.commit();
        logger.info(`[${noticiaId}] Alerta distribuida a ${companiesSnap.size} empresas.`);
    }
    catch (error) {
        logger.error(`[${noticiaId}] Error al distribuir la alerta:`, error);
        // Opcional: Marcar la noticia o el análisis con un estado de error de distribución.
    }
});
//# sourceMappingURL=distributeNoticiaAlert.js.map