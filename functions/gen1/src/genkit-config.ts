// functions/gen1/src/genkit-config.ts
import { genkit, Genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as logger from 'firebase-functions/logger';

let aiInstance: Genkit | null = null;

/**
 * Obtiene una instancia inicializada de Genkit AI para funciones de 1ra Gen.
 */
export function getInitializedGenkitAi(): Genkit {
  if (aiInstance) {
    return aiInstance;
  }

  // Las funciones de 1ra Gen con secrets configurados los exponen en process.env
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    logger.error("[getInitializedGenkitAi] La variable de entorno GEMINI_API_KEY no está definida.");
    throw new Error("GEMINI_API_KEY no está disponible en el entorno de ejecución.");
  }

  aiInstance = genkit({
    plugins: [
      googleAI({ apiKey })
    ],
  });

  logger.info("[getInitializedGenkitAi] Instancia de Genkit (Gen1) creada.");
  return aiInstance;
}
