// src/server/genkit.ts
import { Genkit } from "@genkit-ai/core";
import { googleAI } from "@genkit-ai/googleai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("[Genkit] GEMINI_API_KEY not set. AI may fail in production.");
}

export const ai = new Genkit({
  plugins: [
    googleAI({
      apiKey,
    }),
  ],
});
