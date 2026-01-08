"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ai = void 0;
// functions/src/genkit-config.ts
const genkit_1 = require("genkit");
const google_genai_1 = require("@genkit-ai/google-genai");
/**
 * Inicialización central de Genkit.
 * - Usa GEMINI_API_KEY (Secret Manager) como fuente principal.
 * - Fallback a GOOGLE_API_KEY si existiera.
 */
exports.ai = (0, genkit_1.genkit)({
    plugins: [
        (0, google_genai_1.googleAI)({
            apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
        }),
    ],
});
