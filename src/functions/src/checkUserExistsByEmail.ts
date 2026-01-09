// src/functions/src/checkUserExistsByEmail.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const checkUserExistsByEmail = onCall(
  async (request) => {
    const { email, invId } = request.data;
    const db = admin.firestore();

    if (!email || typeof email !== "string" || !invId || typeof invId !== "string") {
      throw new HttpsError("invalid-argument", "Se requiere un 'email' y un 'invId' válidos en la solicitud.");
    }
    
    try {
      const invRef = db.collection("invitacionesUsuarios").doc(invId);
      const invSnap = await invRef.get();

      if (!invSnap.exists) {
        throw new HttpsError("permission-denied", "La invitación proporcionada no es válida o ha expirado.");
      }

      const invData = invSnap.data();
      if (invData?.email.toLowerCase().trim() !== email.toLowerCase().trim()) {
        throw new HttpsError("permission-denied", "La invitación no corresponde al correo electrónico especificado.");
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
      
      if (error instanceof HttpsError) {
          throw error;
      }

      logger.error(`[checkUserExists] Error inesperado al verificar email ${email}:`, error);
      throw new HttpsError("internal", "Ocurrió un error inesperado al verificar la cuenta.");
    }
  }
);
