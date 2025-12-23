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
exports.createCompanyUser = void 0;
// functions/src/createCompanyUser.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const APP_BASE_URL = "https://www.pcgoperacion.com";
function buildAcceptInviteUrl(invId, email) {
    if (!APP_BASE_URL) {
        logger.error("CRÍTICO: La constante APP_BASE_URL no está configurada. No se pueden generar enlaces de invitación.");
        throw new https_1.HttpsError("internal", "El servidor no está configurado correctamente para enviar invitaciones. Falta la URL base de la aplicación.");
    }
    const appBaseUrl = APP_BASE_URL.replace(/\/+$/, "");
    return `${appBaseUrl}/accept-invite?invId=${encodeURIComponent(invId)}&email=${encodeURIComponent(email)}`;
}
exports.createCompanyUser = (0, https_1.onCall)({
    region: "southamerica-west1",
    cpu: 1,
    memory: "256MiB",
    timeoutSeconds: 60,
    cors: true
}, async (request) => {
    const auth = admin.auth();
    const db = admin.firestore();
    const ctx = request.auth;
    if (!ctx) {
        throw new https_1.HttpsError("unauthenticated", "No autenticado.");
    }
    if (ctx.token.role !== "superadmin") {
        throw new https_1.HttpsError("permission-denied", "Solo SUPER_ADMIN puede crear usuarios.");
    }
    const data = request.data;
    if (!data.companyId || !data.email || !data.nombre || !data.role) {
        throw new https_1.HttpsError("invalid-argument", "Faltan campos obligatorios: companyId, email, nombre, role.");
    }
    if (!data.password || data.password.length < 6) {
        throw new https_1.HttpsError("invalid-argument", "La contraseña es obligatoria y debe tener al menos 6 caracteres.");
    }
    const companyRef = db.collection("companies").doc(data.companyId);
    const companySnap = await companyRef.get();
    if (!companySnap.exists) {
        throw new https_1.HttpsError("not-found", "La empresa no existe.");
    }
    const companyData = companySnap.data();
    let userRecord;
    try {
        userRecord = await auth.createUser({
            email: data.email,
            password: data.password,
            displayName: data.nombre,
            emailVerified: false,
            disabled: false,
        });
    }
    catch (error) {
        if (error.code === "auth/email-already-exists") {
            throw new https_1.HttpsError("already-exists", "Ya existe un usuario con este email.");
        }
        throw new https_1.HttpsError("internal", "Error creando el usuario en Auth.", error);
    }
    const uid = userRecord.uid;
    await auth.setCustomUserClaims(uid, {
        role: data.role,
        companyId: data.companyId,
    });
    const now = admin.firestore.FieldValue.serverTimestamp();
    const userProfileRef = db.collection("users").doc(uid);
    await userProfileRef.set({
        nombre: data.nombre,
        email: data.email,
        role: data.role,
        empresaId: data.companyId,
        activo: true,
        createdAt: now,
        updatedAt: now,
    }, { merge: true });
    const invitationRef = db.collection("invitacionesUsuarios").doc();
    const invitationId = invitationRef.id;
    await invitationRef.set({
        email: data.email,
        empresaId: data.companyId,
        empresaNombre: companyData?.nombreFantasia || companyData?.razonSocial || '',
        roleDeseado: data.role,
        estado: 'pendiente',
        createdAt: now,
        creadoPorUid: ctx.uid,
    });
    const acceptInviteUrl = buildAcceptInviteUrl(invitationId, data.email);
    await db.collection("mail").add({
        to: [data.email],
        message: {
            subject: `Bienvenido a PCG - Acceso para ${companyData?.nombre}`,
            html: `
            <p>Hola ${data.nombre},</p>
            <p>Has sido registrado en la plataforma PCG para la empresa <strong>${companyData?.nombre}</strong>.</p>
            <p>Tu rol asignado es: <strong>${data.role}</strong>.</p>
            <p>Para completar tu registro y acceder a la plataforma, por favor haz clic en el siguiente enlace. Se te pedirá que establezcas una nueva contraseña si es tu primer ingreso.</p>
            <p><a href="${acceptInviteUrl}">Activar mi cuenta y acceder a PCG</a></p>
            <p>Si el botón no funciona, copia y pega esta URL en tu navegador:</p>
            <p><a href="${acceptInviteUrl}">${acceptInviteUrl}</a></p>
            <p>Por seguridad, establece tu contraseña desde el enlace de activación.</p>
            <p>Gracias,<br>El equipo de PCG</p>`,
        },
    });
    return {
        uid,
        email: data.email,
        nombre: data.nombre,
        role: data.role,
        companyId: data.companyId,
    };
});
//# sourceMappingURL=createCompanyUser.js.map