// src/server/genkit.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import 'dotenv/config';

// This is a server-only module and must not be imported into any client-side code.

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("CRITICAL ERROR: The GEMINI_API_KEY environment variable is not set. AI features will not work.");
}

export const ai = genkit({
  plugins: [
    // Explicitly provide the API key from environment variables.
    googleAI({ apiKey: apiKey })
  ]
});
