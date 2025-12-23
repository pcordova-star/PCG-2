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
// Se define la URL base de la aplicación. Para producción, esto debería ser una variable de entorno.
const APP_BASE_URL = process.env.APP_BASE_URL || "https://www.pcgoperacion.com";
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
    // Validación de permisos robusta para superadmin
    const requesterClaims = await auth.getUser(ctx.uid);
    if (requesterClaims.customClaims?.role !== "superadmin") {
        throw new https_1.HttpsError("permission-denied", "Solo SUPER_ADMIN puede crear usuarios.");
    }
    const data = request.data;
    if (!data.companyId || !data.email || !data.nombre || !data.role) {
        throw new https_1.HttpsError("invalid-argument", "Faltan campos obligatorios: companyId, email, nombre, role.");
    }
    const companyRef = db.collection("companies").doc(data.companyId);
    const companySnap = await companyRef.get();
    if (!companySnap.exists) {
        throw new https_1.HttpsError("not-found", "La empresa no existe.");
    }
    const companyData = companySnap.data();
    let userRecord;
    try {
        userRecord = await auth.getUserByEmail(data.email);
        logger.info(`Usuario existente encontrado para ${data.email}. Reutilizando UID: ${userRecord.uid}`);
    }
    catch (error) {
        if (error.code === 'auth/user-not-found') {
            logger.info(`No existe usuario para ${data.email}. Creando uno nuevo.`);
            userRecord = await auth.createUser({
                email: data.email,
                displayName: data.nombre,
                emailVerified: false,
                disabled: false,
            });
        }
        else {
            throw new https_1.HttpsError("internal", "Error verificando el usuario en Auth.", error);
        }
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
    const actionCodeSettings = {
        url: `${APP_BASE_URL}/accept-invite?invId=${encodeURIComponent(invitationId)}&email=${encodeURIComponent(data.email)}`,
        handleCodeInApp: false,
    };
    const passwordResetLink = await auth.generatePasswordResetLink(data.email, actionCodeSettings);
    await db.collection("mail").add({
        to: [data.email],
        message: {
            subject: `Bienvenido a PCG - Acceso para ${companyData?.nombreFantasia || companyData?.razonSocial}`,
            html: `
            <p>Hola ${data.nombre},</p>
            <p>Has sido registrado en la plataforma PCG para la empresa <strong>${companyData?.nombreFantasia || companyData?.razonSocial}</strong>.</p>
            <p>Tu rol asignado es: <strong>${data.role}</strong>.</p>
            <p>Para completar tu registro y activar tu cuenta, por favor establece tu contraseña haciendo clic en el siguiente enlace:</p>
            <p><a href="${passwordResetLink}">Activar mi cuenta y definir contraseña</a></p>
            <p>Si el botón no funciona, copia y pega esta URL en tu navegador:</p>
            <p><a href="${passwordResetLink}">${passwordResetLink}</a></p>
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