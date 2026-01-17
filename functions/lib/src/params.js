"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEMINI_API_KEY_SECRET = void 0;
// src/functions/src/params.ts
const params_1 = require("firebase-functions/params");
/**
 * Define el secreto para la API Key de Gemini.
 * Esto permite que las Cloud Functions de 2ª Generación accedan al secreto de forma segura.
 */
exports.GEMINI_API_KEY_SECRET = (0, params_1.defineSecret)('GEMINI_API_KEY');
