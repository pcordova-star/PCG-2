// functions/src/genkit-config.ts
// Este archivo centraliza la configuración de Genkit para las Cloud Functions.
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as functions from 'firebase-functions';

// Asegúrate de tener GEMINI_API_KEY en tus variables de entorno de Firebase Functions
// firebase functions:config:set gemini.key="TU_API_KEY"
// Esta línea busca la clave primero en las variables de entorno del proceso y luego en la config de Firebase Functions.
const geminiApiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.key;


export const ai = genkit({
  plugins: [
    googleAI({ apiKey: geminiApiKey })
  ]
});
