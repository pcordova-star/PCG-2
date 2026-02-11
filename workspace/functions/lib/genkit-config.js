"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ai = void 0;
// workspace/functions/src/genkit-config.ts
const core_1 = require("@genkit-ai/core");
const googleai_1 = require("@genkit-ai/googleai");
// Centralizamos la inicialización de Genkit para las Cloud Functions.
exports.ai = (0, core_1.genkit)({
    plugins: [
        // La clave se carga desde el entorno de ejecución de la función,
        // que es habilitado por la opción 'runWith({ secrets: ... })'
        (0, googleai_1.googleAI)({ apiKey: process.env.GOOGLE_GENAI_API_KEY }),
    ],
    logLevel: 'debug',
    enableTracingAndMetrics: true,
});
//# sourceMappingURL=genkit-config.js.map