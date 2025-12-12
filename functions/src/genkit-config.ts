// functions/src/genkit-config.ts
// Este archivo centraliza la configuración de Genkit para las Cloud Functions.
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import 'dotenv/config';

// Asegúrate de tener GEMINI_API_KEY en tus variables de entorno de Firebase Functions
// firebase functions:config:set gemini.key="TU_API_KEY"
const geminiApiKey = process.env.GEMINI_API_KEY;

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: geminiApiKey })
  ]
});
