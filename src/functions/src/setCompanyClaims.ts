// functions/src/setCompanyClaims.ts
import * as functions from "firebase-functions";
import { getAdminApp } from "./firebaseAdmin";

const adminApp = getAdminApp();
const auth = adminApp.auth();

/**
 * Asigna claims de empresa a un usuario.
 * Solo un SUPER_ADMIN puede ejecutar esta función.
 *
 * Data esperado:
 * {
 *   uid: string,
 *   companyId: string
 * }
 */
export const setCompanyClaims = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    // 1. Verificar autenticación
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Debes estar autenticado."
      );
    }

    // 2. Verificar permisos (solo superadmin)
    const requester = await auth.getUser(context.auth.uid);
    if (requester.customClaims?.role !== "superadmin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Solo SUPER_ADMIN puede asignar empresa a un usuario."
      );
    }

    // 3. Validar input
    const { uid, companyId } = data || {};
    if (!uid || !companyId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Debes proporcionar uid y companyId."
      );
    }

    try {
      // 4. Asignar claims al usuario
      await auth.setCustomUserClaims(uid, {
        role: "company_user",
        companyId,
      });

      return {
        status: "ok",
        message: `Claims asignados correctamente al usuario ${uid}.`,
      };
    } catch (error: any) {
      throw new functions.https.HttpsError(
        "internal",
        "Error al asignar company claims.",
        error.message
      );
    }
  });
