// functions/src/genkit-config.ts
// Este archivo centraliza la configuración de Genkit para las Cloud Functions.
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as logger from "firebase-functions/logger";
import { GEMINI_API_KEY_SECRET } from './params'; // Importar el parámetro del secreto

// Log de diagnóstico en el arranque del módulo.
const apiKey = GEMINI_API_KEY_SECRET.value();
logger.info(`[genkit-config] Verificación de API Key al inicio: Presente=${!!apiKey}, Longitud=${apiKey?.length || 0}`);

// La clave se obtiene a través del parámetro de secreto definido.
export const ai = genkit({
  plugins: [
    googleAI({ apiKey: apiKey })
  ]
});
