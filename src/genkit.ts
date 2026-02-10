// src/genkit.ts
import "server-only";

import { genkit } from "@genkit-ai/core";
import { googleAI } from "@genkit-ai/googleai";

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY!,
    }),
  ],
});
