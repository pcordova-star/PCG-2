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
// functions/src/analizarPlano.ts
const functions = __importStar(require("firebase-functions"));
const logger = __importStar(require("firebase-functions/logger"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const zod_1 = require("zod");
const node_fetch_1 = __importDefault(require("node-fetch"));
const adminApp = (0, firebaseAdmin_1.getAdminApp)();
// Esquema para validar la entrada de la función
const AnalisisPlanoSchema = zod_1.z.object({
    photoDataUri: zod_1.z.string().startsWith("data:image/jpeg;base64,", {
        message: "El archivo debe ser una imagen JPEG en formato Data URI.",
    }),
});
exports.analizarPlano = functions
    .region("us-central1")
    .runWith({ timeoutSeconds: 540, memory: "1GB" })
    .https.onCall(async (data, context) => {
    // 1. Autenticación
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "El usuario debe estar autenticado para realizar un análisis.");
    }
    // 2. Validación del input
    const validationResult = AnalisisPlanoSchema.safeParse(data);
    if (!validationResult.success) {
        logger.error("Invalid input for analizarPlano", validationResult.error.flatten());
        throw new functions.https.HttpsError("invalid-argument", "Los datos proporcionados son inválidos.", validationResult.error.flatten().fieldErrors);
    }
    // 3. Obtener la clave de API desde las variables de entorno
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        logger.error("GEMINI_API_KEY no está configurada en el servidor.");
        throw new functions.https.HttpsError("internal", "La configuración del servidor de IA es incorrecta.");
    }
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    // 4. Extraer datos de la imagen y preparar el cuerpo de la solicitud
    try {
        const base64Data = validationResult.data.photoDataUri.split(",")[1];
        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: base64Data,
                            },
                        },
                    ],
                },
            ],
        };
        // 5. Llamar a la API de Gemini
        const response = await (0, node_fetch_1.default)(geminiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            const errorBody = await response.json();
            logger.error("Error desde la API de Gemini:", errorBody);
            throw new functions.https.HttpsError("internal", `Error de la API de Gemini: ${errorBody.error?.message || response.statusText}`);
        }
        const responseData = await response.json();
        const analysisText = responseData.candidates[0]?.content?.parts[0]?.text || "No se pudo obtener un análisis.";
        // 6. Retornar el resultado
        return { status: "ok", analysis: analysisText };
    }
    catch (error) {
        logger.error("Error catastrófico en analizarPlano:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "Ocurrió un error inesperado al procesar el plano.", error.message);
    }
});
//# sourceMappingURL=analizarPlano.js.map