// functions/src/genkit-config.ts

import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import * as logger from "firebase-functions/logger";
import { GEMINI_API_KEY_SECRET } from "./params";

let aiInstance: any = null;

export function getInitializedGenkitAi() {
  if (aiInstance) return aiInstance;

  const apiKey = GEMINI_API_KEY_SECRET.value();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está disponible en runtime.");
  }

  logger.info("[genkit-config] Secret cargado correctamente.");

  aiInstance = genkit({
    plugins: [
      googleAI({
        apiKey
      })
    ]
  });

  return aiInstance;
}
