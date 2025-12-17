// src/functions/src/test-google-ai.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { ai } from "./genkit-config";

/**
 * Función "smoke test" para validar que Genkit y la API de Gemini
 * están funcionando correctamente desde el entorno de Cloud Functions.
 */
export const testGoogleAi = onCall(
  {
    // Esta función necesita acceso al mismo secreto.
    secrets: [{ secret: "GEMINI_API_KEY", projectId: "pcg-ia" }],
  },
  async (request) => {
    // 1. Logging de seguridad para verificar la clave.
    const apiKeyExists = !!process.env.GEMINI_API_KEY;
    logger.info(`[testGoogleAi] Verificación de API Key: Existe=${apiKeyExists}, Longitud=${process.env.GEMINI_API_KEY?.length || 0}`);
    
    if (!apiKeyExists) {
      logger.error("[testGoogleAi] La variable de entorno GEMINI_API_KEY no está disponible.");
      throw new HttpsError("failed-precondition", "La configuración del servidor para la API de IA es incorrecta.");
    }
    
    try {
      logger.info("[testGoogleAi] Intentando generar contenido con Genkit y Gemini...");
      const response = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        prompt: "Confirma que estás funcionando. Responde solo con: 'OK'",
      });

      const textResult = response.text();
      logger.info(`[testGoogleAi] Respuesta del modelo: ${textResult}`);

      if (textResult.includes('OK')) {
        return {
          ok: true,
          message: "La conexión con la API de Google AI a través de Genkit fue exitosa.",
          response: textResult
        };
      } else {
        throw new Error(`Respuesta inesperada del modelo: ${textResult}`);
      }

    } catch (error: any) {
      logger.error("[testGoogleAi] Error al llamar a la API de Gemini:", error);
      throw new HttpsError("internal", `Error al contactar el modelo de IA: ${error.message}`);
    }
  }
);
