// functions/src/genkit-config.ts
// Este archivo centraliza la configuración de Genkit para las Cloud Functions.
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as logger from "firebase-functions/logger";

// Log de diagnóstico en el arranque del módulo para verificar la presencia de la API key.
// Esto se ejecuta una sola vez cuando la instancia de la función se inicia (cold start).
const apiKey = process.env.GEMINI_API_KEY;
logger.info(`[genkit-config] Verificación de API Key al inicio: Presente=${!!apiKey}, Longitud=${apiKey?.length || 0}`);

// La clave se obtiene de las variables de entorno inyectadas en la Cloud Function
// a través de la opción 'secrets' o la configuración global.
// Se elimina el fallback a GOOGLE_API_KEY para evitar ambigüedad.
export const ai = genkit({
  plugins: [
    googleAI({ apiKey: apiKey })
  ]
});
