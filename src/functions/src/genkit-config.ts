// functions/src/genkit-config.ts
import { genkit, Genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as logger from "firebase-functions/logger";

let aiInstance: Genkit | null = null;

export function getInitializedGenkitAi(): Genkit {
  if (aiInstance) return aiInstance;

  const apiKey = process.env.GEMINI_API_KEY;

  logger.info(`[getInitializedGenkitAi] API Key runtime: ${!!apiKey}`);

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está disponible.");
  }

  aiInstance = genkit({
    plugins: [
      googleAI({ apiKey })
    ]
  });

  return aiInstance;
}
