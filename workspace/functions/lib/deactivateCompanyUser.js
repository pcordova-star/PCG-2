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
exports.deactivateCompanyUser = void 0;
// workspace/functions/src/deactivateCompanyUser.ts
const functions = __importStar(require("firebase-functions"));
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const adminApp = (0, firebaseAdmin_1.getAdminApp)();
// Refactored to onCall for consistency and easier auth handling
exports.deactivateCompanyUser = functions
    .region("us-central1")
    .https.onCall(async (data, context) => {
    // 1. Check for authentication
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "El usuario no está autenticado.");
    }
    const { uid: requesterUid } = context.auth;
    const requesterClaims = context.auth.token;
    const requesterRole = requesterClaims.role;
    // 2. Validate input data
    const { userId, motivo } = data;
    if (!userId) {
        throw new functions.https.HttpsError("invalid-argument", "El ID del usuario a desactivar es requerido.");
    }
    const auth = adminApp.auth();
    const db = adminApp.firestore();
    // 3. Permission Check
    if (requesterRole !== "superadmin" && requesterRole !== "admin_empresa") {
        throw new functions.https.HttpsError("permission-denied", "Permiso denegado. Se requiere rol de administrador.");
    }
    // 4. Scope Check (if admin_empresa)
    if (requesterRole === "admin_empresa") {
        const requesterCompanyId = requesterClaims.companyId;
        if (!requesterCompanyId) {
            throw new functions.https.HttpsError("permission-denied", "El administrador no tiene una empresa asociada.");
        }
        const targetUserSnap = await db.collection("users").doc(userId).get();
        if (!targetUserSnap.exists) {
            throw new functions.https.HttpsError("not-found", "El usuario a desactivar no fue encontrado.");
        }
        const targetUserData = targetUserSnap.data();
        // An admin can only deactivate users of their own company or subcontractors of their company.
        if (targetUserData.empresaId !== requesterCompanyId) {
            // Let's check if the user belongs to a subcontractor of the admin's company
            if (!targetUserData.subcontractorId) {
                throw new functions.https.HttpsError("permission-denied", "No puedes gestionar usuarios de otra empresa.");
            }
            const subRef = await db.collection('subcontractors').doc(targetUserData.subcontractorId).get();
            if (!subRef.exists || subRef.data()?.companyId !== requesterCompanyId) {
                throw new functions.https.HttpsError("permission-denied", "No puedes gestionar usuarios de un subcontratista de otra empresa.");
            }
        }
    }
    // 5. Deactivation Logic
    try {
        logger.info(`Iniciando desactivación para usuario ${userId} por ${requesterUid}`);
        await auth.updateUser(userId, { disabled: true });
        logger.info(`Usuario ${userId} deshabilitado en Firebase Auth.`);
        const userDocRef = db.collection("users").doc(userId);
        await userDocRef.update({
            activo: false,
            fechaBaja: admin.firestore.FieldValue.serverTimestamp(),
            motivoBaja: motivo || "Desactivado por administrador.",
            bajaPorUid: requesterUid,
        });
        logger.info(`Documento de usuario ${userId} marcado como inactivo en Firestore.`);
        await auth.revokeRefreshTokens(userId);
        logger.info(`Tokens de sesión para ${userId} revocados.`);
        return { success: true, message: `Usuario ${userId} ha sido desactivado.` };
    }
    catch (error) {
        logger.error(`Error al desactivar usuario ${userId}:`, error);
        throw new functions.https.HttpsError("internal", "Ocurrió un error interno al desactivar el usuario.", error.message);
    }
});
//# sourceMappingURL=deactivateCompanyUser.js.map