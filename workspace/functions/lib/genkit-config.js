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
exports.getInitializedGenkitAi = getInitializedGenkitAi;
// functions/src/genkit-config.ts
const genkit_1 = require("genkit");
const google_genai_1 = require("@genkit-ai/google-genai");
const logger = __importStar(require("firebase-functions/logger"));
let aiInstance = null;
/**
 * Obtiene una instancia inicializada de Genkit AI.
 * La inicialización es diferida (lazy) para asegurar que las variables de entorno (secretos)
 * estén disponibles en el momento de la ejecución de la función, no durante la carga del módulo.
 *
 * @returns Una instancia de Genkit configurada.
 */
function getInitializedGenkitAi() {
    // Memoization simple para evitar reinicializar en una instancia "caliente" (warm instance).
    if (aiInstance) {
        return aiInstance;
    }
    const apiKey = process.env.GEMINI_API_KEY;
    // Log de diagnóstico en tiempo de ejecución para verificar la presencia de la clave.
    const apiKeyExists = !!apiKey;
    logger.info(`[getInitializedGenkitAi] Verificación de API Key en runtime: Existe=${apiKeyExists}, Longitud=${apiKey?.length || 0}`);
    if (!apiKeyExists) {
        // Es crucial lanzar un error si la clave no está, para que la función falle explícitamente.
        throw new Error("GEMINI_API_KEY no está disponible en el entorno de ejecución de la función.");
    }
    aiInstance = (0, genkit_1.genkit)({
        plugins: [
            (0, google_genai_1.googleAI)({ apiKey })
        ]
    });
    return aiInstance;
}
//# sourceMappingURL=genkit-config.js.map