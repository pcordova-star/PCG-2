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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analizarPlano = void 0;
// workspace/functions/src/analizarPlano.ts
const functions = __importStar(require("firebase-functions"));
const axios_1 = __importDefault(require("axios"));
const logger = __importStar(require("firebase-functions/logger"));
// Helper para limpiar JSON que puede venir con formato markdown
function cleanJsonString(rawString) {
    // Quitar bloques de código Markdown (```json ... ```)
    let cleaned = rawString.replace(/```json/g, "").replace(/```/g, "");
    // Encontrar el primer '{' y el último '}' para ignorar texto basura
    const startIndex = cleaned.indexOf("{");
    const endIndex = cleaned.lastIndexOf("}");
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        // Si no se encuentra un objeto JSON, puede ser un string simple de error.
        // Lo envolvemos en un JSON de error.
        logger.error("Respuesta de IA no contenía un objeto JSON válido.", { rawString });
        return `{"summary": "Error: La IA no generó una respuesta JSON válida. Intente con una imagen más clara o un plano menos denso.", "elements": []}`;
    }
    return cleaned.substring(startIndex, endIndex + 1);
}
exports.analizarPlano = functions
    .region("us-central1")
    .runWith({
    timeoutSeconds: 300,
    memory: "1GB",
    secrets: ["GOOGLE_GENAI_API_KEY"]
})
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión.");
    }
    const { photoDataUri, opciones, notas } = data;
    if (!photoDataUri || typeof photoDataUri !== "string" || !opciones) {
        throw new functions.https.HttpsError("invalid-argument", "Faltan la imagen o las opciones de análisis.");
    }
    const API_KEY = process.env.GOOGLE_GENAI_API_KEY;
    if (!API_KEY) {
        logger.error("La variable de entorno GOOGLE_GENAI_API_KEY no está configurada.");
        throw new functions.https.HttpsError("internal", "Falta configuración de API Key en el servidor.");
    }
    const opcionesSeleccionadas = Object.entries(opciones)
        .filter(([, value]) => value)
        .map(([key]) => `- ${key}`)
        .join('\n');
    const prompt = `
Eres un experto analista de cubicaciones de construcción. Tu tarea es analizar un plano y extraer las cantidades según las opciones seleccionadas por el usuario.

Opciones de análisis seleccionadas:
${opcionesSeleccionadas || "Ninguna opción específica seleccionada, realiza un análisis general."}

Notas adicionales del usuario (úsalas como guía, especialmente para escalas o alturas):
${notas || "Sin notas."}

Analiza la imagen del plano adjunto y devuelve tu análisis EXCLUSIVAMENTE en formato JSON. La estructura del JSON debe ser:
{
  "summary": "Un resumen conciso y técnico de lo que pudiste analizar basado en las opciones. Incluye cualquier supuesto clave que hayas hecho (ej. escala, altura).",
  "elements": [
    {
      "type": "tipo de elemento (ej: 'Superficie Útil', 'Muro', 'Losa')",
      "name": "nombre o descripción (ej: 'Living Comedor', 'Muro exterior', 'Losa Nivel 2')",
      "unit": "unidad de medida (ej: 'm²', 'm³', 'ml', 'u')",
      "estimatedQuantity": <número>,
      "confidence": <número de 0 a 1>,
      "notes": "aclaraciones o supuestos sobre esta partida específica"
    }
  ]
}

No incluyas texto adicional ni formato markdown fuera del JSON. Tu respuesta debe ser un JSON parseable directamente.
`;
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${API_KEY}`;
    const match = photoDataUri.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
        throw new functions.https.HttpsError("invalid-argument", "El formato del photoDataUri es inválido. Se esperaba 'data:image/jpeg;base64,...' o similar.");
    }
    const mimeType = match[1]; // e.g., "image/jpeg"
    const base64Data = match[2];
    try {
        logger.info("🚀 Enviando petición a Gemini con prompt estructurado...");
        const response = await axios_1.default.post(URL, {
            contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: mimeType, data: base64Data } }
                    ]
                }],
            generationConfig: {
            // Gemini Pro Vision no soporta response_mime_type: "application/json" directamente.
            // Por eso la limpieza del JSON es crucial.
            }
        });
        const resultado = response.data;
        const rawJson = resultado.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawJson) {
            throw new Error("La respuesta de Gemini no contiene texto JSON válido.");
        }
        const cleanedJson = cleanJsonString(rawJson);
        const parsedResult = JSON.parse(cleanedJson);
        return {
            result: parsedResult // Devolvemos el objeto dentro de una clave "result"
        };
    }
    catch (err) {
        const errorAny = err;
        logger.error("Error en el análisis de plano:", errorAny.message);
        if (errorAny.response?.data) {
            logger.error("Error response data:", JSON.stringify(errorAny.response.data));
        }
        throw new functions.https.HttpsError("internal", errorAny.message || "Error al procesar el plano con la IA.");
    }
});
//# sourceMappingURL=analizarPlano.js.map