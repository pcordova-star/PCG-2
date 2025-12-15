import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Función para asignar el rol de SUPER_ADMIN a un usuario por su email.
 * Esta función es de un solo uso o para mantenimiento y debe ser invocada manually
 * por un desarrollador con acceso a la consola de Firebase.
 */
export const setSuperAdminClaim = onCall(
  { cors: true }, // La región y SA se heredan de setGlobalOptions
  async (request) => {
    // Nota: Para esta función específica, no se valida el rol del invocador,
    // ya que está diseñada para la configuración inicial.
    // En un entorno de producción, se podría agregar una capa de seguridad
    // como verificar si el invocador es el dueño del proyecto.

    const email = request.data.email;
    if (!email || typeof email !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "Se requiere un 'email' en el cuerpo de la solicitud."
      );
    }

    try {
      const auth = admin.auth();
      const db = admin.firestore();

      // 1. Buscar al usuario por email
      const userRecord = await auth.getUserByEmail(email);
      const uid = userRecord.uid;

      // 2. Asignar los custom claims
      await auth.setCustomUserClaims(uid, {
        role: "SUPER_ADMIN"
      });

      // 3. Actualizar el documento del usuario en Firestore
      const userRef = db.collection("users").doc(uid);
      await userRef.set(
        {
          isSuperAdmin: true,
          role: "SUPER_ADMIN", // Opcional, para consistencia
        },
        { merge: true }
      );

      return {
        message: `Éxito: El usuario ${email} (UID: ${uid}) ahora es SUPER_ADMIN.`,
      };
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        throw new HttpsError(
          "not-found",
          `No se encontró ningún usuario con el email: ${email}`
        );
      }
      console.error("Error al asignar SUPER_ADMIN:", error);
      throw new HttpsError(
        "internal",
        "Ocurrió un error inesperado al procesar la solicitud.",
        error.message
      );
    }
  }
);
