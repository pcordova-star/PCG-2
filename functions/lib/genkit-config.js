"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ai = void 0;
// functions/src/genkit-config.ts
// Este archivo centraliza la configuración de Genkit para las Cloud Functions.
const genkit_1 = require("genkit");
const google_genai_1 = require("@genkit-ai/google-genai");
require("dotenv/config");
// Asegúrate de tener GEMINI_API_KEY en tus variables de entorno de Firebase Functions
// firebase functions:config:set gemini.key="TU_API_KEY"
const geminiApiKey = process.env.GEMINI_API_KEY;
exports.ai = (0, genkit_1.genkit)({
    plugins: [
        (0, google_genai_1.googleAI)({ apiKey: geminiApiKey })
    ]
});
//# sourceMappingURL=genkit-config.js.map