// workspace/functions/src/checkUserExistsByEmail.ts
import * as functions from "firebase-functions";
import { getAdminApp } from "./firebaseAdmin";

const adminApp = getAdminApp();
const auth = adminApp.auth();

export const checkUserExistsByEmail = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    if (!data?.email) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email es obligatorio."
      );
    }

    try {
      await auth.getUserByEmail(data.email);
      return { exists: true };
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        return { exists: false };
      }

      throw new functions.https.HttpsError(
        "internal",
        "Error verificando usuario.",
        error.message
      );
    }
  });
