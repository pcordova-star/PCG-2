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
const node_fetch_1 = __importDefault(require("node-fetch")); // Asegúrate de tener instalado node-fetch v2 si usas CommonJS o v3 si usas módulos
exports.analizarPlano = functions
    .region("us-central1")
    .runWith({ timeoutSeconds: 540, memory: "1GB" })
    .https.onCall(async (data, context) => {
    // 1. Verificación de seguridad (Auth)
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debe estar autenticado.");
    }
    // 2. VALIDACIÓN FLEXIBLE
    if (!data ||
        typeof data.photoDataUri !== "string" ||
        !data.photoDataUri.startsWith("data:image/")) {
        throw new functions.https.HttpsError("invalid-argument", "El archivo enviado no es una imagen válida.");
    }
    // 3. API KEY
    // Lo ideal es usar process.env.GEMINI_API_KEY configurada en Firebase
    const apiKey = "AIzaSyDsRbRMKMJ7UQ6CKRdJY6LjeiVyoG1vlkU";
    // 4. PROCESAMIENTO DEL BASE64
    const matches = data.photoDataUri.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        throw new functions.https.HttpsError("invalid-argument", "Formato de imagen corrupto o no reconocido.");
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    // Estructura del Body para Gemini 1.5
    const requestBody = {
        contents: [
            {
                parts: [
                    {
                        text: "Analiza este plano de construcción. Identifica los recintos, muros y elementos principales. Dame un resumen técnico detallado."
                    },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Data,
                        },
                    },
                ],
            },
        ],
    };
    // --- CAMBIO IMPORTANTE AQUÍ ---
    // Usamos gemini-1.5-flash en lugar de gemini-pro-vision
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    try {
        const response = await (0, node_fetch_1.default)(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });
        const json = await response.json();
        // Validación de error de la API
        if (json.error) {
            console.error("Error detallado de Gemini:", JSON.stringify(json.error, null, 2));
            throw new Error(json.error.message || "Error desconocido en la IA");
        }
        // Extracción segura de la respuesta
        const output = json?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "No se obtuvo respuesta de análisis.";
        return {
            status: "ok",
            analysis: output,
        };
    }
    catch (err) {
        console.error("Error al llamar a Gemini:", err);
        throw new functions.https.HttpsError("internal", "Error procesando el plano con IA.", err.message);
    }
});
//# sourceMappingURL=analizarPlano.js.map