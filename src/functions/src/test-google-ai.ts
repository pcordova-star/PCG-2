// src/functions/src/test-google-ai.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getInitializedGenkitAi } from "./genkit-config"; // Importar la función inicializadora
import { GEMINI_API_KEY_SECRET } from "./params";

/**
 * Función "smoke test" para validar que Genkit y la API de Gemini
 * están funcionando correctamente desde el entorno de Cloud Functions.
 */
export const testGoogleAi = onCall(
  {
    // Esta función necesita acceso al mismo secreto, vinculado con el nuevo patrón.
    secrets: [GEMINI_API_KEY_SECRET],
  },
  async (request) => {
    
    try {
      // 1. Inicializar Genkit dentro del handler
      const ai = getInitializedGenkitAi();
      logger.info("[testGoogleAi] Genkit inicializado en runtime.");
      
      logger.info("[testGoogleAi] Intentando generar contenido con Genkit y Gemini...");
      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash-latest',
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
      // Incluir el stack trace en el log para un mejor diagnóstico.
      logger.error("Stack trace:", error.stack);
      throw new HttpsError("internal", `Error al contactar el modelo de IA: ${error.message}`);
    }
  }
);
