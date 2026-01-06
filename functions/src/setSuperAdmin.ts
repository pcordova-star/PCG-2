// functions/src/setSuperAdmin.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Función para asignar el rol de SUPER_ADMIN a un usuario por su email.
 * Esta función es de un solo uso o para mantenimiento y debe ser invocada
 * por un desarrollador con acceso a la consola de Firebase o una página de debug.
 * Se ha securizado para que solo funcione con un email predefinido.
 */
export const setSuperAdminClaim = onCall(
  { cors: true }, // La región y SA se heredan de setGlobalOptions
  async (request) => {
    // 1. Validar que el usuario está autenticado (aunque no sea superadmin aún)
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "La función debe ser llamada por un usuario autenticado.");
    }
    
    const email = request.data.email;
    if (!email || typeof email !== "string") {
      throw new HttpsError("invalid-argument", "Se requiere un 'email' en el cuerpo de la solicitud.");
    }

    // 2. Medida de seguridad CRÍTICA para bootstrap: solo permitir esta operación
    // para el email del superadministrador designado.
    if (email.toLowerCase() !== "pauloandrescordova@gmail.com") {
        throw new HttpsError(
            "permission-denied",
            "Esta función solo puede asignar el rol de superadmin al usuario predefinido."
        );
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
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        throw new HttpsError("not-found", `No se encontró ningún usuario con el email: ${email}`);
      }
      console.error("Error al asignar superadmin:", error);
      throw new HttpsError("internal", "Ocurrió un error inesperado al procesar la solicitud.", error.message);
    }
  }
);
