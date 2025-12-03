import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const storage = admin.storage();

export const getSecureDownloadUrl = onCall(
  { region: "southamerica-west1", cors: true },
  async (request) => {
    // 1. Validar autenticación
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Usuario no autenticado.");
    }

    const { path } = request.data;
    if (!path) {
      throw new HttpsError("invalid-argument", "Falta path del archivo.");
    }

    try {
      // 2. Generar URL firmada válida por 1 minuto
      const bucket = storage.bucket();
      const file = bucket.file(path);

      const [url] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 1 * 60 * 1000, // 1 minuto
      });

      return { url };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);
