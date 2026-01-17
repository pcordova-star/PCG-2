// src/server/genkit.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import 'dotenv/config';

// This is a server-only module and must not be imported into any client-side code.
export const ai = genkit({
  plugins: [
    googleAI() // Using Application Default Credentials by default
  ]
});
