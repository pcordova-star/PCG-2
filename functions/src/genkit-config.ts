// functions/src/genkit-config.ts
import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

/**
 * Inicialización central de Genkit.
 * - Usa GEMINI_API_KEY (Secret Manager) como fuente principal.
 * - Fallback a GOOGLE_API_KEY si existiera.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    }),
  ],
});
