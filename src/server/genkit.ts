// src/server/genkit.ts

import { genkit } from "@genkit-ai/core";
import { googleAI } from "@genkit-ai/googleai";

// Server-only module for Genkit AI.

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("[Genkit] GEMINI_API_KEY is not set. AI features may fail.");
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey,
    }),
  ],
});
