/**
 * src/server/genkit.ts
 */

import { initializeGenkit } from "@genkit-ai/core";
import { googleAI } from "@genkit-ai/googleai";

export const ai = initializeGenkit({
  plugins: [
    googleAI({
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
    }),
  ],
});
