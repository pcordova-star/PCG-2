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
// src/functions/src/setSuperAdmin.ts
const functions = __importStar(require("firebase-functions"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const adminApp = (0, firebaseAdmin_1.getAdminApp)();
exports.setSuperAdminClaim = functions.region("us-central1").https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "La función debe ser llamada por un usuario autenticado.");
    }
    const email = data.email;
    if (!email || typeof email !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "Se requiere un 'email' en el cuerpo de la solicitud.");
    }
    if (email.toLowerCase() !== "pauloandrescordova@gmail.com") {
        throw new functions.https.HttpsError("permission-denied", "Esta función solo puede asignar el rol de superadmin al usuario predefinido.");
    }
    try {
        const auth = adminApp.auth();
        const db = adminApp.firestore();
        const userRecord = await auth.getUserByEmail(email);
        const uid = userRecord.uid;
        await auth.setCustomUserClaims(uid, { role: "superadmin" });
        const userRef = db.collection("users").doc(uid);
        await userRef.set({ role: "superadmin" }, { merge: true });
        return {
            message: `Éxito: El usuario ${email} (UID: ${uid}) ahora es superadmin.`,
        };
    }
    catch (error) {
        if (error.code === "auth/user-not-found") {
            throw new functions.https.HttpsError("not-found", `No se encontró usuario con el email: ${email}`);
        }
        console.error("Error al asignar superadmin:", error);
        throw new functions.https.HttpsError("internal", "Ocurrió un error inesperado.", error.message);
    }
});
//# sourceMappingURL=setSuperAdmin.js.map