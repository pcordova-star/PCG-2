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
exports.setCompanyClaims = void 0;
// src/functions/src/setCompanyClaims.ts
const functions = __importStar(require("firebase-functions"));
const logger = __importStar(require("firebase-functions/logger"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const admin = (0, firebaseAdmin_1.getAdminApp)();
/**
 * Función de utilidad para asignar custom claims (rol y companyId) a un usuario específico.
 * Debe ser invocada por un superadmin.
 */
exports.setCompanyClaims = functions.region("us-central1").https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "La función debe ser llamada por un usuario autenticado.");
    }
    // Validar que el invocador sea superadmin
    const requesterClaims = await admin.auth().getUser(context.auth.uid);
    if (requesterClaims.customClaims?.role !== "superadmin") {
        throw new functions.https.HttpsError("permission-denied", "Solo un superadministrador puede ejecutar esta función.");
    }
    const { uid, role, companyId } = data;
    if (!uid || !role || !companyId) {
        throw new functions.https.HttpsError("invalid-argument", "Se requieren 'uid', 'role' y 'companyId'.");
    }
    try {
        await admin.auth().setCustomUserClaims(uid, { role, companyId });
        // Opcional: Para consistencia, también actualizamos el documento del usuario en Firestore.
        const userRef = admin.firestore().collection("users").doc(uid);
        await userRef.set({ role, empresaId: companyId }, { merge: true });
        logger.info(`Claims actualizados para UID: ${uid}`, { role, companyId });
        return {
            success: true,
            message: `Éxito: Se asignaron los claims al usuario ${uid}. Por favor, pídale que cierre sesión y vuelva a iniciarla.`,
        };
    }
    catch (error) {
        logger.error(`Error al asignar claims para UID ${uid}:`, error);
        throw new functions.https.HttpsError("internal", "Ocurrió un error inesperado al asignar los claims.", error.message);
    }
});
