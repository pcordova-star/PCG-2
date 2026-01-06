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
exports.setSuperAdminClaim = void 0;
// functions/src/setSuperAdmin.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
if (admin.apps.length === 0) {
    admin.initializeApp();
}
/**
 * Función para asignar el rol de SUPER_ADMIN a un usuario por su email.
 * Esta función es de un solo uso o para mantenimiento y debe ser invocada
 * por un desarrollador con acceso a la consola de Firebase o una página de debug.
 * Se ha securizado para que solo funcione con un email predefinido.
 */
exports.setSuperAdminClaim = (0, https_1.onCall)({ cors: true }, // La región y SA se heredan de setGlobalOptions
async (request) => {
    // 1. Validar que el usuario está autenticado (aunque no sea superadmin aún)
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "La función debe ser llamada por un usuario autenticado.");
    }
    const email = request.data.email;
    if (!email || typeof email !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Se requiere un 'email' en el cuerpo de la solicitud.");
    }
    // 2. Medida de seguridad CRÍTICA para bootstrap: solo permitir esta operación
    // para el email del superadministrador designado.
    if (email.toLowerCase() !== "pauloandrescordova@gmail.com") {
        throw new https_1.HttpsError("permission-denied", "Esta función solo puede asignar el rol de superadmin al usuario predefinido.");
    }
    try {
        const auth = admin.auth();
        const db = admin.firestore();
        // 3. Buscar al usuario por email
        const userRecord = await auth.getUserByEmail(email);
        const uid = userRecord.uid;
        // 4. Asignar el custom claim en minúsculas para consistencia
        await auth.setCustomUserClaims(uid, {
            role: "superadmin"
        });
        // 5. Actualizar el documento del usuario en Firestore (buena práctica)
        const userRef = db.collection("users").doc(uid);
        await userRef.set({
            role: "superadmin",
        }, { merge: true });
        return {
            message: `Éxito: El usuario ${email} (UID: ${uid}) ahora es superadmin. Por favor, cierra sesión y vuelve a iniciarla.`,
        };
    }
    catch (error) {
        if (error.code === "auth/user-not-found") {
            throw new https_1.HttpsError("not-found", `No se encontró ningún usuario con el email: ${email}`);
        }
        console.error("Error al asignar superadmin:", error);
        throw new https_1.HttpsError("internal", "Ocurrió un error inesperado al procesar la solicitud.", error.message);
    }
});
//# sourceMappingURL=setSuperAdmin.js.map