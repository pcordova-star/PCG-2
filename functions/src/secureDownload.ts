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

    const { storagePath } = request.data as { storagePath: string };
    if (!storagePath) {
      throw new HttpsError("invalid-argument", "Falta storagePath del archivo.");
    }

    try {
      // 2. Generar URL firmada válida por 1 hora
      const bucket = storage.bucket(); // Bucket por defecto del proyecto
      const file = bucket.file(storagePath);

      const [url] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 60 * 60 * 1000, // 1 hora
      });

      return { url };
    } catch (error: any) {
      console.error("Error generando URL firmada:", error);
      throw new HttpsError("internal", "No se pudo generar la URL segura.", error.message);
    }
  }
);
