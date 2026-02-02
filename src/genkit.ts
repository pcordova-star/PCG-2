/**
 * src/genkit.ts
 */
import { initializeGenkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/google-genai';

const plugins = [];

// Esto hace que la clave de API sea opcional durante el build,
// evitando que el proceso falle en Vercel si la variable de entorno no está configurada.
// La IA no funcionará en producción hasta que se configure la variable.
if (process.env.GOOGLE_GENAI_API_KEY) {
  plugins.push(googleAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY, 
  }));
} else {
  console.warn("ADVERTENCIA: GOOGLE_GENAI_API_KEY no está configurada. Las funciones de IA estarán deshabilitadas.");
}

export const ai = initializeGenkit({
  plugins,
  logLevel: "debug",
  enableTracingAndMetrics: true,
});
