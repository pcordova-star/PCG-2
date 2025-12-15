// functions/src/genkit-config.ts
// Este archivo centraliza la configuración de Genkit para las Cloud Functions.
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// La clave se obtiene de las variables de entorno inyectadas
// por el secreto en la definición de la función.
export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY })
  ]
});
