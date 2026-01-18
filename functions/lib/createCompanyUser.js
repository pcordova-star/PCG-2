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
const functions = __importStar(require("firebase-functions"));
const logger = __importStar(require("firebase-functions/logger"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const admin = (0, firebaseAdmin_1.getAdminApp)();
function buildAcceptInviteUrl(invId, email) {
    const rawBaseUrl = functions.config().app?.base_url || "http://localhost:3000";
    const appBaseUrl = rawBaseUrl.replace(/\/+$/, "");
    return `${appBaseUrl}/accept-invite?invId=${encodeURIComponent(invId)}&email=${encodeURIComponent(email)}`;
}
exports.createCompanyUser = functions
    .region("us-central1")
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "No autenticado.");
    }
    const auth = admin.auth();
    const db = admin.firestore();
    const requesterClaims = await auth.getUser(context.auth.uid);
    if (requesterClaims.customClaims?.role !== "superadmin") {
        throw new functions.https.HttpsError("permission-denied", "Solo SUPER_ADMIN puede crear usuarios.");
    }
    if (!data.companyId || !data.email || !data.nombre || !data.role) {
        throw new functions.https.HttpsError("invalid-argument", "Faltan campos obligatorios: companyId, email, nombre, role.");
    }
    if (!data.password || data.password.length < 6) {
        throw new functions.https.HttpsError("invalid-argument", "La contraseña es obligatoria y debe tener al menos 6 caracteres.");
    }
    const companyRef = db.collection("companies").doc(data.companyId);
    const companySnap = await companyRef.get();
    if (!companySnap.exists) {
        throw new functions.https.HttpsError("not-found", "La empresa no existe.");
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
        logger.info(`Usuario creado con éxito para ${data.email} con UID: ${userRecord.uid}`);
    }
    catch (error) {
        if (error.code === "auth/email-already-exists") {
            throw new functions.https.HttpsError("already-exists", "Ya existe un usuario con este correo electrónico.");
        }
        logger.error("Error creando usuario en Firebase Auth:", error);
        throw new functions.https.HttpsError("internal", "Error interno al crear el usuario en Auth.", error);
    }
    const uid = userRecord.uid;
    await auth.setCustomUserClaims(uid, {
        role: data.role,
        companyId: data.companyId,
    });
    const now = admin.firestore.FieldValue.serverTimestamp();
    await db.collection("users").doc(uid).set({
        nombre: data.nombre,
        email: data.email,
        role: data.role,
        empresaId: data.companyId,
        activo: true,
        createdAt: now,
        updatedAt: now,
        mustChangePassword: true,
    }, { merge: true });
    const invitationRef = db.collection("invitacionesUsuarios").doc();
    await invitationRef.set({
        email: data.email,
        empresaId: data.companyId,
        empresaNombre: companyData.nombreFantasia || companyData.razonSocial || "",
        roleDeseado: data.role,
        estado: "pendiente_auth",
        uid,
        createdAt: now,
        creadoPorUid: context.auth.uid,
    });
    const acceptInviteUrl = buildAcceptInviteUrl(invitationRef.id, data.email);
    await db.collection("mail").add({
        to: [data.email],
        message: {
            from: "PCG Operación <control@pcgoperacion.com>",
            subject: `Invitación a Plataforma de Control de Gestión – ${companyData.nombreFantasia}`,
            html: `
          <p>Hola ${data.nombre},</p>
          <p>Has sido invitado a unirte a <strong>${companyData.nombreFantasia}</strong>.</p>
          <p><a href="${acceptInviteUrl}">Aceptar invitación</a></p>
          <p>${acceptInviteUrl}</p>
        `,
        },
    });
    return {
        uid,
        email: data.email,
        nombre: data.nombre,
        role: data.role,
        companyId: data.companyId,
        message: "Usuario creado exitosamente.",
    };
});
//# sourceMappingURL=createCompanyUser.js.map