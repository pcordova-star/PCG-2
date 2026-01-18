"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEMINI_API_KEY_SECRET = void 0;
// functions/gen2/src/params.ts
const params_1 = require("firebase-functions/params");
/**
 * Define el secreto para la API Key de Gemini para las funciones de 2da Gen.
 */
exports.GEMINI_API_KEY_SECRET = (0, params_1.defineSecret)('GEMINI_API_KEY');
