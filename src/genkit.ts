/**
 * src/genkit.ts
 */
import { initializeGenkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';

export const ai = initializeGenkit({
  plugins: [
    googleAI({
      // CLAVE FIJA (Sin process.env para evitar errores)
      apiKey: "AIzaSyBMKBvSYQBvS6X_EFE-cUtI2RDkThmXhtM", 
    }),
  ],
});
