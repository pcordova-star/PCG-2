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
exports.testGoogleAi = void 0;
// src/functions/src/test-google-ai.ts
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const genkit_config_1 = require("./genkit-config"); // Importar la función inicializadora
/**
 * Función "smoke test" para validar que Genkit y la API de Gemini
 * están funcionando correctamente desde el entorno de Cloud Functions.
 */
exports.testGoogleAi = (0, https_1.onCall)({}, // El secreto ahora se maneja en getInitializedGenkitAi a través de process.env
async (request) => {
    try {
        // 1. Inicializar Genkit dentro del handler
        const ai = (0, genkit_config_1.getInitializedGenkitAi)();
        logger.info("[testGoogleAi] Genkit inicializado en runtime.");
        logger.info("[testGoogleAi] Intentando generar contenido con Genkit y Gemini...");
        const response = await ai.generate({
            model: 'googleai/gemini-1.5-flash-latest',
            prompt: "Confirma que estás funcionando. Responde solo con: 'OK'",
        });
        const textResult = response.text;
        logger.info(`[testGoogleAi] Respuesta del modelo: ${textResult}`);
        if (textResult.includes('OK')) {
            return {
                ok: true,
                message: "La conexión con la API de Google AI a través de Genkit fue exitosa.",
                response: textResult
            };
        }
        else {
            throw new Error(`Respuesta inesperada del modelo: ${textResult}`);
        }
    }
    catch (error) {
        logger.error("[testGoogleAi] Error al llamar a la API de Gemini:", error);
        // Incluir el stack trace en el log para un mejor diagnóstico.
        logger.error("Stack trace:", error.stack);
        throw new https_1.HttpsError("internal", `Error al contactar el modelo de IA: ${error.message}`);
    }
});
//# sourceMappingURL=test-google-ai.js.map