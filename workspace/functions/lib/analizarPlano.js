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
const node_fetch_1 = __importDefault(require("node-fetch")); // Asegúrate de tener instalado 'node-fetch'
exports.analizarPlano = functions
    .region("us-central1")
    .runWith({ timeoutSeconds: 300, memory: "1GB" }) // 5 minutos es suficiente
    .https.onCall(async (data, context) => {
    // 1. SEGURIDAD: Solo usuarios logueados
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión.");
    }
    // 2. DATOS: Validar que llegue una imagen
    const imagenBase64 = data.photoDataUri;
    if (!imagenBase64 || typeof imagenBase64 !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "Falta la imagen.");
    }
    // Limpieza básica del string base64 si viene con prefijo
    const cleanBase64 = imagenBase64.replace(/^data:image\/\w+;base64,/, "");
    // 3. LA CLAVE MAESTRA (Asegúrate que esta sea la AIza... correcta)
    const API_KEY = "AIzaSyBMKBvSYQBvS6X_EFE-cUtI2RDkThmXhtM";
    // 4. CONFIGURACIÓN: Directo a la API REST de Google (Sin SDKs que fallen)
    // Usamos la versión v1beta y el modelo flash
    const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
    const payload = {
        contents: [{
                parts: [
                    { text: "Eres un experto en construcción. Analiza este plano arquitectónico. Enumera los recintos, identifica muros y elementos estructurales. Sé técnico y preciso." },
                    {
                        inline_data: {
                            mime_type: "image/jpeg", // Asumimos jpeg o png, Flash suele tragárselo igual
                            data: cleanBase64
                        }
                    }
                ]
            }]
    };
    try {
        console.log("Enviando petición a Gemini Flash...");
        const response = await (0, node_fetch_1.default)(ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        // Si Gemini devuelve error, lo atrapamos aquí
        if (result.error) {
            console.error("Error devuelto por Google:", JSON.stringify(result.error));
            throw new Error(result.error.message || "Error desconocido de Gemini");
        }
        // Sacamos el texto limpio
        const textoAnalisis = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textoAnalisis) {
            throw new Error("Gemini respondió ok, pero no generó texto.");
        }
        return {
            success: true,
            data: textoAnalisis
        };
    }
    catch (error) {
        console.error("Falló la conexión:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
//# sourceMappingURL=analizarPlano.js.map