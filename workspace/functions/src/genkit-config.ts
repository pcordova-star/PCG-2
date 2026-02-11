// workspace/functions/src/genkit-config.ts
import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { defineSecret } from 'firebase-functions/params';

// Define que la función depende de este secreto.
// La plataforma se encarga de proveer el valor.
const geminiApiKey = defineSecret('GOOGLE_GENAI_API_KEY');

// Centralizamos la inicialización de Genkit para las Cloud Functions.
export const ai = genkit({
    plugins: [
        googleAI({ apiKey: geminiApiKey as any }),
    ],
    logLevel: 'debug',
    enableTracingAndMetrics: true,
});
