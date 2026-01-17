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
exports.deactivateCompanyUser = void 0;
// src/functions/src/deactivateCompanyUser.ts
const functions = __importStar(require("firebase-functions"));
const logger = __importStar(require("firebase-functions/logger"));
const auth_1 = require("firebase-admin/auth");
const cors_1 = __importDefault(require("cors"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const admin = (0, firebaseAdmin_1.getAdminApp)();
// Configuración de CORS más flexible para desarrollo y producción
const allowedOrigins = [
    "https://pcgoperacion.com",
    "https://www.pcgoperacion.com",
    "http://localhost:3000",
    /https:\/\/.*\.google\.com/,
    /https:\/\/.*\.firebaseapp\.com/,
    /https:\/\/.*\.web\.app/,
];
const corsHandler = (0, cors_1.default)({ origin: allowedOrigins });
exports.deactivateCompanyUser = functions.region("us-central1").https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                throw new functions.https.HttpsError("unauthenticated", "Unauthorized: No token provided.");
            }
            const token = authHeader.split(" ")[1];
            const decodedToken = await (0, auth_1.getAuth)().verifyIdToken(token);
            const userClaims = decodedToken.role;
            if (userClaims !== "superadmin") {
                throw new functions.https.HttpsError("permission-denied", "Permission Denied: Caller is not a superadmin.");
            }
            const { userId, motivo } = req.body;
            if (!userId) {
                throw new functions.https.HttpsError("invalid-argument", "Bad Request: userId is required.");
            }
            const auth = admin.auth();
            const db = admin.firestore();
            logger.info(`Iniciando desactivación para usuario ${userId} por ${decodedToken.uid}`);
            await auth.updateUser(userId, { disabled: true });
            logger.info(`Usuario ${userId} deshabilitado en Firebase Auth.`);
            const userDocRef = db.collection("users").doc(userId);
            await userDocRef.update({
                activo: false,
                fechaBaja: admin.firestore.FieldValue.serverTimestamp(),
                motivoBaja: motivo || "Desactivado por administrador.",
                bajaPorUid: decodedToken.uid,
            });
            logger.info(`Documento de usuario ${userId} marcado como inactivo en Firestore.`);
            await auth.revokeRefreshTokens(userId);
            logger.info(`Tokens de sesión para ${userId} revocados.`);
            res.status(200).json({ success: true, message: `Usuario ${userId} ha sido desactivado.` });
        }
        catch (error) {
            logger.error(`Error al desactivar usuario:`, error);
            if (error.code) {
                res.status(400).json({ success: false, error: error.message, code: error.code });
            }
            else {
                res.status(500).json({ success: false, error: "Internal Server Error", details: error.message });
            }
        }
    });
});
