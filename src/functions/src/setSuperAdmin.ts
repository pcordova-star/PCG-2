// functions/src/setSuperAdmin.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const setSuperAdminClaim = onCall(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "La función debe ser llamada por un usuario autenticado.");
    }
    
    const email = request.data.email;
    if (!email || typeof email !== "string") {
      throw new HttpsError("invalid-argument", "Se requiere un 'email' en el cuerpo de la solicitud.");
    }

    if (email.toLowerCase() !== "pauloandrescordova@gmail.com") {
        throw new HttpsError(
            "permission-denied",
            "Esta función solo puede asignar el rol de superadmin al usuario predefinido."
        );
    }

    try {
      const auth = admin.auth();
      const db = admin.firestore();

      const userRecord = await auth.getUserByEmail(email);
      const uid = userRecord.uid;

      await auth.setCustomUserClaims(uid, { role: "superadmin" });

      const userRef = db.collection("users").doc(uid);
      await userRef.set({ role: "superadmin" }, { merge: true });

      return {
        message: `Éxito: El usuario ${email} (UID: ${uid}) ahora es superadmin.`,
      };
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        throw new HttpsError("not-found", `No se encontró usuario con el email: ${email}`);
      }
      console.error("Error al asignar superadmin:", error);
      throw new HttpsError("internal", "Ocurrió un error inesperado.", error.message);
    }
});
