"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEMINI_API_KEY_SECRET = void 0;
// functions/src/params.ts
const params_1 = require("firebase-functions/params");
/**
 * Define el secreto para la API Key de Gemini.
 * Este objeto será importado y vinculado a las funciones que necesiten acceso.
 * El nombre 'GEMINI_API_KEY' debe coincidir con el nombre del secreto en Google Secret Manager.
 */
exports.GEMINI_API_KEY_SECRET = (0, params_1.defineSecret)('GEMINI_API_KEY');
//# sourceMappingURL=params.js.map