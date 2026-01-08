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
exports.checkUserExistsByEmail = void 0;
// src/functions/src/checkUserExistsByEmail.ts
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * Verifica de forma segura si un usuario existe en Firebase Authentication por su email,
 * pero solo si la solicitud incluye un ID de invitación válido y coincidente.
 */
exports.checkUserExistsByEmail = functions.region("southamerica-west1").https.onCall(async (data, context) => {
    const { email, invId } = data;
    const db = admin.firestore();
    if (!email || typeof email !== "string" || !invId || typeof invId !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "Se requiere un 'email' y un 'invId' válidos en la solicitud.");
    }
    try {
        // 1. Validar la invitación primero para asegurar que la solicitud es legítima.
        const invRef = db.collection("invitacionesUsuarios").doc(invId);
        const invSnap = await invRef.get();
        if (!invSnap.exists) {
            throw new functions.https.HttpsError("permission-denied", "La invitación proporcionada no es válida o ha expirado.");
        }
        const invData = invSnap.data();
        if ((invData === null || invData === void 0 ? void 0 : invData.email.toLowerCase().trim()) !== email.toLowerCase().trim()) {
            throw new functions.https.HttpsError("permission-denied", "La invitación no corresponde al correo electrónico especificado.");
        }
        logger.info(`[checkUserExists] Validación de invitación ${invId} para ${email} exitosa. Procediendo a verificar Auth.`);
        // 2. Si la invitación es válida, proceder a verificar la existencia del usuario en Auth.
        await admin.auth().getUserByEmail(email);
        logger.info(`[checkUserExists] Usuario encontrado para el email: ${email}`);
        return { exists: true };
    }
    catch (error) {
        // Si el error es 'auth/user-not-found', significa que el usuario no existe.
        if (error.code === "auth/user-not-found") {
            logger.info(`[checkUserExists] Usuario NO encontrado para el email: ${email}`);
            return { exists: false };
        }
        // Si el error ya es un HttpsError (de nuestra validación), lo relanzamos.
        if (error.code && error.httpErrorCode) {
            throw error;
        }
        // Para cualquier otro error (problema de red, configuración, etc.), lanzamos un error interno.
        logger.error(`[checkUserExists] Error inesperado al verificar email ${email}:`, error);
        throw new functions.https.HttpsError("internal", "Ocurrió un error inesperado al verificar la cuenta.");
    }
});
