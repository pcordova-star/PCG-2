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
const axios_1 = __importDefault(require("axios")); // Usamos axios porque es indestructible
exports.analizarPlano = functions
    .region("us-central1")
    .runWith({ timeoutSeconds: 300, memory: "1GB" })
    .https.onCall(async (data, context) => {
    // 1. Validaciones de seguridad
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión.");
    }
    const imagenBase64 = data.photoDataUri;
    if (!imagenBase64 || typeof imagenBase64 !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "Falta la imagen.");
    }
    // Limpieza de la imagen
    const cleanBase64 = imagenBase64.replace(/^data:image\/\w+;base64,/, "");
    // 2. CONFIGURACIÓN (Tu clave y modelo 2.0 que ya validamos)
    const API_KEY = "AIzaSyBMKBvSYQBvS6X_EFE-cUtI2RDkThmXhtM";
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
    try {
        console.log("🚀 Enviando petición a Gemini con Axios...");
        // 3. PETICIÓN CON AXIOS (Funciona en cualquier versión de Node)
        const response = await axios_1.default.post(URL, {
            contents: [{
                    parts: [
                        { text: "Eres un experto en construcción. Analiza este plano arquitectónico. Enumera los recintos, identifica muros y elementos estructurales. Dame un resumen técnico preciso." },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: cleanBase64
                            }
                        }
                    ]
                }]
        });
        // Axios entrega los datos directamente en .data
        const resultado = response.data;
        // Validación extra por si la IA devuelve vacío
        if (!resultado.candidates || resultado.candidates.length === 0) {
            console.warn("La IA respondió OK pero sin candidatos.");
            return { success: true, data: "El análisis no generó texto legible." };
        }
        const texto = resultado.candidates[0].content.parts[0].text;
        return {
            success: true,
            data: texto
        };
    }
    catch (error) {
        // Manejo de errores detallado
        console.error("💥 Error en Axios:", error.message);
        if (error.response) {
            // El servidor de Google respondió con un error (ej: 400, 500)
            console.error("Datos del error:", JSON.stringify(error.response.data));
            throw new functions.https.HttpsError("internal", `Error de IA: ${JSON.stringify(error.response.data)}`);
        }
        else {
            // Error de conexión u otro
            throw new functions.https.HttpsError("internal", error.message);
        }
    }
});
//# sourceMappingURL=analizarPlano.js.map