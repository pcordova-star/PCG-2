"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ai = void 0;
// functions/src/genkit-config.ts
// Este archivo centraliza la configuración de Genkit para las Cloud Functions.
const genkit_1 = require("genkit");
const google_genai_1 = require("@genkit-ai/google-genai");
// La clave se obtiene de las variables de entorno inyectadas
// por el secreto en la definición de la función.
exports.ai = (0, genkit_1.genkit)({
    plugins: [
        (0, google_genai_1.googleAI)({ apiKey: process.env.GEMINI_API_KEY })
    ]
});
//# sourceMappingURL=genkit-config.js.map