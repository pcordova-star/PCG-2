// workspace/functions/src/genkit-config.ts
import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';

// Centralizamos la inicialización de Genkit para las Cloud Functions.
// Creamos y exportamos la instancia 'ai' que contiene los métodos como 'definePrompt'.
export const ai = genkit({
    plugins: [
        // La clave se carga desde el entorno de ejecución de la función,
        // que es habilitado por la opción 'runWith({ secrets: ... })'
        googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY }),
    ],
    logLevel: 'debug',
    enableTracingAndMetrics: true,
});
