// src/server/genkit.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// This is a server-only module and must not be imported into any client-side code.

// NOTE: The API key is not explicitly passed here.
// Genkit will attempt to use Application Default Credentials (ADC)
// or other configured authentication methods.
// This avoids conflicts with Firebase Functions secrets during deployment.

export const ai = genkit({
  plugins: [
    googleAI()
  ]
});
