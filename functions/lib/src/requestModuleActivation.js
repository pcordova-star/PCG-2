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
exports.requestModuleActivation = void 0;
// src/functions/src/requestModuleActivation.ts
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const auth_1 = require("firebase-admin/auth");
const firebaseAdmin_1 = require("./firebaseAdmin");
const admin = __importStar(require("firebase-admin"));
const adminApp = (0, firebaseAdmin_1.getAdminApp)();
const SUPERADMIN_EMAIL = "pauloandrescordova@gmail.com";
exports.requestModuleActivation = (0, https_1.onRequest)({
    region: "southamerica-west1",
    cors: true
}, async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ success: false, error: "Method Not Allowed" });
        return;
    }
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ success: false, error: "Unauthorized: No token provided." });
            return;
        }
        const token = authHeader.split(" ")[1];
        const decodedToken = await (0, auth_1.getAuth)().verifyIdToken(token);
        const { uid } = decodedToken;
        const userEmail = decodedToken.email || "No disponible";
        const userName = decodedToken.name || userEmail;
        let companyId = decodedToken.companyId;
        // Si el companyId no está en los claims, búscalo en Firestore como fallback.
        if (!companyId) {
            logger.info(`companyId no encontrado en los claims para UID ${uid}. Buscando en Firestore...`);
            const userDoc = await adminApp.firestore().collection("users").doc(uid).get();
            if (userDoc.exists) { // <- LÍNEA CORREGIDA
                companyId = userDoc.data()?.empresaId;
            }
        }
        if (!companyId) {
            res.status(400).json({ success: false, error: "El usuario no está asociado a ninguna empresa." });
            return;
        }
        const { moduleId, moduleTitle } = req.body;
        if (!moduleId || !moduleTitle) {
            res.status(400).json({ success: false, error: "Faltan los parámetros 'moduleId' y 'moduleTitle'." });
            return;
        }
        const db = adminApp.firestore();
        const companyRef = db.collection("companies").doc(companyId);
        const companySnap = await companyRef.get();
        const companyName = companySnap.exists
            ? companySnap.data()?.nombreFantasia || "Empresa sin nombre"
            : "Empresa desconocida";
        const requestRef = await db.collection("moduleActivationRequests").add({
            companyId,
            companyName,
            moduleId,
            moduleTitle,
            requestedByUserId: uid,
            requestedByUserEmail: userEmail,
            requestedByUserName: userName,
            requestedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "pending",
        });
        logger.info(`Solicitud de activación registrada: ${requestRef.id}`);
        await db.collection("mail").add({
            to: [SUPERADMIN_EMAIL],
            message: {
                subject: `PCG: Nueva solicitud de activación de módulo - ${companyName}`,
                html: `
            <p>Se ha recibido una nueva solicitud de activación de módulo:</p>
            <ul>
              <li><strong>Empresa:</strong> ${companyName} (${companyId})</li>
              <li><strong>Módulo Solicitado:</strong> ${moduleTitle} (${moduleId})</li>
              <li><strong>Solicitado por:</strong> ${userName} (${userEmail})</li>
            </ul>
          `,
            },
        });
        res.status(200).json({ success: true, message: "Solicitud registrada y notificada." });
    }
    catch (error) {
        logger.error("Error al procesar la solicitud de activación:", error);
        res.status(500).json({ success: false, error: "Ocurrió un error al procesar tu solicitud." });
    }
});
