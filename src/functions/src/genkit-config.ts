// functions/src/genkit-config.ts
import { genkit } from "@genkit-ai/core";
import { googleAI } from "@genkit-ai/google-ai";
import * as logger from "firebase-functions/logger";
import { PPCG_GEMINI_API_KEY_SECRET } from "./params";

export function getInitializedGenkitAi() {
  const apiKey = PPCG_GEMINI_API_KEY_SECRET.value();

  if (!apiKey) {
    throw new Error("PPCG_GEMINI_API_KEY no está disponible en runtime.");
  }

  logger.info("[genkit-config] API Key cargada correctamente.");

  return genkit({
    plugins: [
      googleAI({ apiKey })
    ]
  });
}
