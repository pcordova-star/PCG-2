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
exports.setCompanyClaims = void 0;
// workspace/functions/src/setCompanyClaims.ts
const functions = __importStar(require("firebase-functions"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const adminApp = (0, firebaseAdmin_1.getAdminApp)();
const auth = adminApp.auth();
exports.setCompanyClaims = functions
    .region("us-central1")
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debes estar autenticado.");
    }
    const requester = await auth.getUser(context.auth.uid);
    if (requester.customClaims?.role !== "superadmin") {
        throw new functions.https.HttpsError("permission-denied", "Solo SUPER_ADMIN puede asignar empresa a un usuario.");
    }
    const { uid, companyId } = data || {};
    if (!uid || !companyId) {
        throw new functions.https.HttpsError("invalid-argument", "Debes proporcionar uid y companyId.");
    }
    try {
        await auth.setCustomUserClaims(uid, {
            role: "company_user",
            companyId,
        });
        return {
            status: "ok",
            message: `Claims asignados correctamente al usuario ${uid}.`,
        };
    }
    catch (error) {
        throw new functions.https.HttpsError("internal", "Error al asignar company claims.", error.message);
    }
});
//# sourceMappingURL=setCompanyClaims.js.map