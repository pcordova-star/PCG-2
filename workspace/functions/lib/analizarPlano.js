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
const functions = __importStar(require("firebase-functions"));
const axios_1 = __importDefault(require("axios"));
const logger = __importStar(require("firebase-functions/logger"));
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
    const imagenBase64 = data.photoDataUri;
    if (!imagenBase64 || typeof imagenBase64 !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "Falta la imagen.");
    }
    // La clave ahora se lee de forma segura desde el entorno de la función
    const API_KEY = process.env.GOOGLE_GENAI_API_KEY;
    if (!API_KEY) {
        logger.error("La variable de entorno GOOGLE_GENAI_API_KEY no está configurada.");
        throw new functions.https.HttpsError("internal", "Falta configuración de API Key en el servidor.");
    }
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
    const cleanBase64 = imagenBase64.replace(/^data:image\/\w+;base64,/, "");
    try {
        logger.info("🚀 Enviando petición a Gemini con Axios...");
        const response = await axios_1.default.post(URL, {
            contents: [{
                    parts: [
                        { text: "Eres un experto en construcción. Analiza este plano arquitectónico. Enumera los recintos, identifica muros y elementos estructurales. Dame un resumen técnico preciso." },
                        { inline_data: { mime_type: "image/jpeg", data: cleanBase64 } }
                    ]
                }]
        });
        const resultado = response.data;
        const texto = resultado.candidates?.[0]?.content?.parts?.[0]?.text;
        return {
            success: true,
            data: texto || "Sin respuesta legible."
        };
    }
    catch (err) {
        const errorAny = err;
        logger.error("Error Gemini:", errorAny.message);
        if (errorAny.response?.data) {
            logger.error("Error response data:", JSON.stringify(errorAny.response.data));
        }
        throw new functions.https.HttpsError("internal", errorAny.message || "Error al procesar");
    }
});
//# sourceMappingURL=analizarPlano.js.map