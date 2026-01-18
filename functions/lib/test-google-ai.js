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
// functions/src/test-google-ai.ts
const functions = __importStar(require("firebase-functions"));
const logger = __importStar(require("firebase-functions/logger"));
exports.testGoogleAi = functions
    .region("us-central1")
    .https.onCall(async (data, context) => {
    const prompt = data?.prompt;
    if (!prompt || typeof prompt !== "string") {
        throw new functions.https.HttpsError("invalid-argument", 'Formato requerido: {"data":{"prompt":"..."}}');
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        logger.error("GEMINI_API_KEY no está configurada en el servidor.");
        throw new functions.https.HttpsError("internal", "La clave de API de Gemini no está configurada en el servidor.");
    }
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
    };
    try {
        logger.info("[testGoogleAi] Enviando solicitud a Gemini...");
        const response = await fetch(geminiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            const errorBody = await response.json();
            logger.error("Error desde la API de Gemini:", errorBody);
            throw new Error(`Error de la API de Gemini: ${errorBody.error?.message || response.statusText}`);
        }
        const responseData = await response.json();
        const text = responseData.candidates[0]?.content?.parts[0]?.text;
        logger.info("[testGoogleAi] Solicitud exitosa.");
        return { ok: true, text: text || "Respuesta vacía del modelo." };
    }
    catch (e) {
        logger.error("Llamada a la API de Gemini falló:", e);
        throw new functions.https.HttpsError("internal", `Llamada a la API de Gemini falló: ${e.message}`);
    }
});
//# sourceMappingURL=test-google-ai.js.map