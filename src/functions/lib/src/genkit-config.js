"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ai = void 0;
// functions/src/genkit-config.ts
// Este archivo centraliza la configuración de Genkit para las Cloud Functions.
const genkit_1 = require("genkit");
const google_genai_1 = require("@genkit-ai/google-genai");
const logger = __importStar(require("firebase-functions/logger"));
// Log de diagnóstico en el arranque del módulo para verificar la presencia de la API key.
// Esto se ejecuta una sola vez cuando la instancia de la función se inicia (cold start).
const apiKey = process.env.GEMINI_API_KEY;
logger.info(`[genkit-config] Verificación de API Key al inicio: Presente=${!!apiKey}, Longitud=${apiKey?.length || 0}`);
// La clave se obtiene de las variables de entorno inyectadas en la Cloud Function
// a través de la opción 'secrets' o la configuración global.
// Se elimina el fallback a GOOGLE_API_KEY para evitar ambigüedad.
exports.ai = (0, genkit_1.genkit)({
    plugins: [
        (0, google_genai_1.googleAI)({ apiKey: apiKey })
    ]
});
