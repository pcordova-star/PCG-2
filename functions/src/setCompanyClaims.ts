// src/functions/src/setCompanyClaims.ts
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import { getAdminApp } from "./firebaseAdmin";

const admin = getAdminApp();

/**
 * Función de utilidad para asignar custom claims (rol y companyId) a un usuario específico.
 * Debe ser invocada por un superadmin.
 */
export const setCompanyClaims = functions.region("us-central1").https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "La función debe ser llamada por un usuario autenticado.");
    }
    
    // Validar que el invocador sea superadmin
    const requesterClaims = await admin.auth().getUser(context.auth.uid);
    if (requesterClaims.customClaims?.role !== "superadmin") {
      throw new functions.https.HttpsError("permission-denied", "Solo un superadministrador puede ejecutar esta función.");
    }

    const { uid, role, companyId } = data;

    if (!uid || !role || !companyId) {
        throw new functions.https.HttpsError("invalid-argument", "Se requieren 'uid', 'role' y 'companyId'.");
    }

    try {
        await admin.auth().setCustomUserClaims(uid, { role, companyId });

        // Opcional: Para consistencia, también actualizamos el documento del usuario en Firestore.
        const userRef = admin.firestore().collection("users").doc(uid);
        await userRef.set({ role, empresaId: companyId }, { merge: true });
        
        logger.info(`Claims actualizados para UID: ${uid}`, { role, companyId });

        return {
            success: true,
            message: `Éxito: Se asignaron los claims al usuario ${uid}. Por favor, pídale que cierre sesión y vuelva a iniciarla.`,
        };
    } catch (error: any) {
        logger.error(`Error al asignar claims para UID ${uid}:`, error);
        throw new functions.https.HttpsError("internal", "Ocurrió un error inesperado al asignar los claims.", error.message);
    }
});
