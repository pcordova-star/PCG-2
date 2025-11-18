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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSuperAdminClaim = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * Función para asignar el rol de SUPER_ADMIN a un usuario por su email.
 * Esta función es de un solo uso o para mantenimiento y debe ser invocada manualmente
 * por un desarrollador con acceso a la consola de Firebase.
 */
exports.setSuperAdminClaim = (0, https_1.onCall)({ region: "southamerica-west1", cors: true }, async (request) => {
    // Nota: Para esta función específica, no se valida el rol del invocador,
    // ya que está diseñada para la configuración inicial.
    // En un entorno de producción, se podría agregar una capa de seguridad
    // como verificar si el invocador es el dueño del proyecto.
    const email = request.data.email;
    if (!email || typeof email !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Se requiere un 'email' en el cuerpo de la solicitud.");
    }
    try {
        const auth = admin.auth();
        const db = admin.firestore();
        // 1. Buscar al usuario por email
        const userRecord = await auth.getUserByEmail(email);
        const uid = userRecord.uid;
        // 2. Asignar los custom claims
        await auth.setCustomUserClaims(uid, {
            role: "superadmin"
        });
        // 3. Actualizar el documento del usuario en Firestore
        const userRef = db.collection("users").doc(uid);
        await userRef.set({
            role: "superadmin", // Opcional, para consistencia
        }, { merge: true });
        return {
            message: `Éxito: El usuario ${email} (UID: ${uid}) ahora es SUPER_ADMIN.`,
        };
    }
    catch (error) {
        if (error.code === "auth/user-not-found") {
            throw new https_1.HttpsError("not-found", `No se encontró ningún usuario con el email: ${email}`);
        }
        console.error("Error al asignar SUPER_ADMIN:", error);
        throw new https_1.HttpsError("internal", "Ocurrió un error inesperado al procesar la solicitud.", error.message);
    }
});
//# sourceMappingURL=setSuperAdmin.js.map