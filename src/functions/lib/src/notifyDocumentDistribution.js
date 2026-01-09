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
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyDocumentDistribution = void 0;
// functions/src/notifyDocumentDistribution.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = (0, firestore_1.getFirestore)();
const NotifyDocumentSchema = zod_1.z.object({
    projectDocumentId: zod_1.z.string().min(1),
    projectId: zod_1.z.string().min(1),
    companyId: zod_1.z.string().min(1),
    companyDocumentId: zod_1.z.string().min(1),
    version: zod_1.z.string().min(1),
    notifiedUserId: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
});
exports.notifyDocumentDistribution = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "El usuario no está autenticado.");
    }
    const parsed = NotifyDocumentSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Los datos proporcionados son inválidos.", parsed.error.flatten());
    }
    const { projectDocumentId, projectId, companyId, companyDocumentId, version, notifiedUserId, email, } = parsed.data;
    try {
        const projectDocRef = db.collection("projectDocuments").doc(projectDocumentId);
        const projectDocSnap = await projectDocRef.get();
        if (!projectDocSnap.exists) {
            throw new https_1.HttpsError("not-found", "El documento del proyecto no fue encontrado.");
        }
        const projectDocument = projectDocSnap.data();
        const now = admin.firestore.Timestamp.now();
        const sentAtDate = now.toDate();
        await db.collection("documentDistribution").add({
            companyId,
            projectId,
            projectDocumentId,
            companyDocumentId,
            version,
            notifiedUserId,
            email,
            method: "email",
            sentAt: now,
        });
        await db.collection("mail").add({
            to: [email],
            message: {
                subject: `Notificación de Distribución de Documento: ${projectDocument.code}`,
                html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h2>Notificación de Distribución de Documento</h2>
              <p>Se ha distribuido una nueva versión de un documento relevante para su conocimiento:</p>
              <ul>
                <li><strong>Nombre del Documento:</strong> ${projectDocument.name}</li>
                <li><strong>Código:</strong> ${projectDocument.code}</li>
                <li><strong>Versión:</strong> ${version}</li>
                <li><strong>Fecha de Distribución:</strong> ${sentAtDate.toLocaleDateString('es-CL')}</li>
              </ul>
              <hr>
              <p style="font-style: italic; color: #555;">
                Este correo electrónico constituye evidencia de distribución de documentos controlados según los requisitos del Sistema de Gestión de Calidad (ISO 9001).
              </p>
            </div>
          `,
            },
        });
        logger.info(`Distribución de documento ${projectDocumentId} a ${email} registrada y notificada con éxito.`);
        return { ok: true, message: "Distribución notificada y registrada." };
    }
    catch (error) {
        logger.error("Error en notifyDocumentDistribution:", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "Ocurrió un error inesperado al procesar la distribución.", error.message);
    }
});
