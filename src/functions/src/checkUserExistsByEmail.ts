import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import { getAdminApp } from "./firebaseAdmin";

const admin = getAdminApp();

export const checkUserExistsByEmail = functions.region("us-central1").https.onCall(async (data, context) => {
    const { email, invId } = data;
    const db = admin.firestore();

    if (!email || typeof email !== "string" || !invId || typeof invId !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "Se requiere un 'email' y un 'invId' válidos en la solicitud.");
    }
    
    try {
        const invRef = db.collection("invitacionesUsuarios").doc(invId);
        const invSnap = await invRef.get();

        if (!invSnap.exists) {
            throw new functions.https.HttpsError("permission-denied", "La invitación proporcionada no es válida o ha expirado.");
        }

        const invData = invSnap.data();
        if (invData?.email.toLowerCase().trim() !== email.toLowerCase().trim()) {
            throw new functions.https.HttpsError("permission-denied", "La invitación no corresponde al correo electrónico especificado.");
        }
        
        logger.info(`[checkUserExists] Validación de invitación ${invId} para ${email} exitosa. Procediendo a verificar Auth.`);

        await admin.auth().getUserByEmail(email);
        logger.info(`[checkUserExists] Usuario encontrado para el email: ${email}`);
        return { exists: true };

    } catch (error: any) {
        if (error.code === "auth/user-not-found") {
            logger.info(`[checkUserExists] Usuario NO encontrado para el email: ${email}`);
            return { exists: false };
        }
        
        if (error.code && error.httpErrorCode) {
            throw error;
        }

        logger.error(`[checkUserExists] Error inesperado al verificar email ${email}:`, error);
        throw new functions.https.HttpsError("internal", "Ocurrió un error inesperado al verificar la cuenta.");
    }
});
