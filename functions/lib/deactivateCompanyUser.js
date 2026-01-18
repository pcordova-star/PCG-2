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
// src/functions/src/deactivateCompanyUser.ts
const functions = __importStar(require("firebase-functions"));
const logger = __importStar(require("firebase-functions/logger"));
const auth_1 = require("firebase-admin/auth");
const admin = __importStar(require("firebase-admin"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const cors = require('cors')({ origin: true });
const adminApp = (0, firebaseAdmin_1.getAdminApp)();
exports.deactivateCompanyUser = functions
    .region("us-central1")
    .runWith({ memory: "256MB", timeoutSeconds: 30 })
    .https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).json({ success: false, error: "Method Not Allowed" });
            return;
        }
        try {
            // 1. Autenticación y Autorización
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                res.status(401).json({ success: false, error: "Unauthorized: No token provided." });
                return;
            }
            const token = authHeader.split(" ")[1];
            const decodedToken = await (0, auth_1.getAuth)().verifyIdToken(token);
            const userClaims = decodedToken.role; // Acceder a custom claims
            if (userClaims !== "superadmin") {
                res.status(403).json({ success: false, error: "Permission Denied: Caller is not a superadmin." });
                return;
            }
            // 2. Validación de Datos
            const { userId, motivo } = req.body;
            if (!userId) {
                res.status(400).json({ success: false, error: "Bad Request: userId is required." });
                return;
            }
            const auth = adminApp.auth();
            const db = adminApp.firestore();
            // 3. Lógica de Desactivación
            logger.info(`Iniciando desactivación para usuario ${userId} por ${decodedToken.uid}`);
            // a) Deshabilitar en Firebase Auth
            await auth.updateUser(userId, { disabled: true });
            logger.info(`Usuario ${userId} deshabilitado en Firebase Auth.`);
            // b) Marcar como inactivo en Firestore y añadir auditoría
            const userDocRef = db.collection("users").doc(userId);
            await userDocRef.update({
                activo: false,
                fechaBaja: admin.firestore.FieldValue.serverTimestamp(),
                motivoBaja: motivo || "Desactivado por administrador.",
                bajaPorUid: decodedToken.uid,
            });
            logger.info(`Documento de usuario ${userId} marcado como inactivo en Firestore.`);
            // 4. Revocar tokens de sesión (seguridad adicional)
            await auth.revokeRefreshTokens(userId);
            logger.info(`Tokens de sesión para ${userId} revocados.`);
            // 5. Respuesta Exitosa
            res.status(200).json({ success: true, message: `Usuario ${userId} ha sido desactivado.` });
        }
        catch (error) {
            logger.error(`Error al desactivar usuario:`, error);
            res.status(500).json({ success: false, error: "Internal Server Error", details: error.message });
        }
    });
});
//# sourceMappingURL=deactivateCompanyUser.js.map