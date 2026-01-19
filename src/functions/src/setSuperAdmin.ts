// functions/src/setSuperAdmin.ts
import * as functions from "firebase-functions";
import { getAdminApp } from "./firebaseAdmin";

const adminApp = getAdminApp();
const auth = adminApp.auth();

/**
 * Asigna el rol SUPER_ADMIN a un usuario por UID.
 * Solo otro SUPER_ADMIN puede ejecutarlo.
 */
export const setSuperAdminClaim = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    // Validación de autenticación
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Debes estar autenticado."
      );
    }

    // Validación de permisos del solicitante
    const requester = await auth.getUser(context.auth.uid);
    if (requester.customClaims?.role !== "superadmin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Solo SUPER_ADMIN puede asignar este rol."
      );
    }

    // Validación de input
    const targetUid = data?.uid;
    if (!targetUid) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Debes proporcionar un UID."
      );
    }

    try {
      await auth.setCustomUserClaims(targetUid, { role: "superadmin" });

      return {
        status: "ok",
        message: `Usuario ${targetUid} ahora es SUPER_ADMIN.`,
      };
    } catch (error: any) {
      throw new functions.https.HttpsError(
        "internal",
        "No se pudo asignar el rol.",
        error.message
      );
    }
  });
