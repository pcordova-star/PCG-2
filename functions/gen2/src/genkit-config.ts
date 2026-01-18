// functions/gen2/src/genkit-config.ts
import { genkit, Genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import * as logger from "firebase-functions/logger";
import { GEMINI_API_KEY_SECRET } from "./params";

let aiInstance: Genkit | null = null;

export function getInitializedGenkitAi(): Genkit {
  if (aiInstance) {
    return aiInstance;
  }

  const apiKey = GEMINI_API_KEY_SECRET.value();
  const apiKeyExists = !!apiKey;
  logger.info(`[Gen2-getInitializedGenkitAi] Verificación de API Key en runtime: Existe=${apiKeyExists}`);

  if (!apiKeyExists) {
    throw new Error("GEMINI_API_KEY (v2 secret) no está disponible en el entorno de ejecución de la función.");
  }
  
  aiInstance = genkit({
    plugins: [
      googleAI({ apiKey })
    ]
  });

  logger.info("[Gen2-getInitializedGenkitAi] Instancia de Genkit (Gen2) creada.");
  return aiInstance;
}
