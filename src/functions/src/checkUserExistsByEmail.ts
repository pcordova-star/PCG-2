// src/functions/src/checkUserExistsByEmail.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Verifica de forma segura si un usuario existe en Firebase Authentication por su email.
 * Esta función es invocada desde el frontend para validar el estado de una invitación
 * sin necesidad de intentar un inicio de sesión.
 */
export const checkUserExistsByEmail = onCall(
  {
    cors: true,
    // Se puede aplicar un rate limit para evitar abusos
    // rateLimits: {
    //   perInstance: {
    //     bucket: 'check-user-existence',
    //     intervalSeconds: 60,
    //     maxCalls: 10
    //   }
    // }
  },
  async (request) => {
    const email = request.data.email;

    if (!email || typeof email !== "string") {
      throw new HttpsError("invalid-argument", "Se requiere un 'email' válido en la solicitud.");
    }
    
    try {
      // Intenta obtener el usuario por email. Esta es la forma segura de verificar existencia con el Admin SDK.
      await admin.auth().getUserByEmail(email);
      // Si no lanza error, el usuario existe.
      logger.info(`[checkUserExists] Usuario encontrado para el email: ${email}`);
      return { exists: true };
    } catch (error: any) {
      // Si el error es 'auth/user-not-found', significa que el usuario no existe.
      if (error.code === "auth/user-not-found") {
        logger.info(`[checkUserExists] Usuario NO encontrado para el email: ${email}`);
        return { exists: false };
      }
      // Para cualquier otro error (problema de red, configuración, etc.), lanzamos un error interno.
      logger.error(`[checkUserExists] Error inesperado al verificar email ${email}:`, error);
      throw new HttpsError("internal", "Ocurrió un error inesperado al verificar la cuenta.");
    }
  }
);
