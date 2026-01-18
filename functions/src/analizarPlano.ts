// functions/src/analizarPlano.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { getAdminApp } from "./firebaseAdmin";
import { z } from "zod";

const adminApp = getAdminApp();

// Esquema para validar la entrada de la función
const AnalisisPlanoSchema = z.object({
  photoDataUri: z.string().startsWith("data:image/jpeg;base64,", {
    message: "El archivo debe ser una imagen JPEG en formato Data URI.",
  }),
});

export const analizarPlano = functions
  .region("us-central1")
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .https.onCall(async (data, context) => {
    // 1. Autenticación
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "El usuario debe estar autenticado para realizar un análisis."
      );
    }

    // 2. Validación del input
    const validationResult = AnalisisPlanoSchema.safeParse(data);
    if (!validationResult.success) {
      logger.error("Invalid input for analizarPlano", validationResult.error.flatten());
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Los datos proporcionados son inválidos.",
        validationResult.error.flatten().fieldErrors
      );
    }

    // 3. Obtener la clave de API desde las variables de entorno
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error("GEMINI_API_KEY no está configurada en el servidor.");
      throw new functions.https.HttpsError(
        "internal",
        "La configuración del servidor de IA es incorrecta."
      );
    }

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // 4. Extraer datos de la imagen y preparar el cuerpo de la solicitud
    try {
      const base64Data = validationResult.data.photoDataUri.split(",")[1];
      const requestBody = {
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data,
                },
              },
            ],
          },
        ],
      };
      
      // 5. Llamar a la API de Gemini
      const response = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        logger.error("Error desde la API de Gemini:", errorBody);
        throw new functions.https.HttpsError(
          "internal",
          `Error de la API de Gemini: ${errorBody.error?.message || response.statusText}`
        );
      }

      const responseData = await response.json();
      const analysisText = responseData.candidates[0]?.content?.parts[0]?.text || "No se pudo obtener un análisis.";
      
      // 6. Retornar el resultado
      return { status: "ok", analysis: analysisText };

    } catch (error: any) {
      logger.error("Error catastrófico en analizarPlano:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Ocurrió un error inesperado al procesar el plano.",
        error.message
      );
    }
  });
