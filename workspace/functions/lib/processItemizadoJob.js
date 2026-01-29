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
exports.processItemizadoJob = void 0;
// workspace/functions/src/processItemizadoJob.ts
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const node_fetch_1 = __importDefault(require("node-fetch"));
const adminApp = (0, firebaseAdmin_1.getAdminApp)();
const db = adminApp.firestore();
exports.processItemizadoJob = functions
    .region("us-central1")
    .runWith({
    timeoutSeconds: 540,
    memory: "1GB",
    secrets: ["GOOGLE_GENAI_API_KEY"]
})
    .firestore.document("itemizadoImportJobs/{jobId}")
    .onCreate(async (snapshot, context) => {
    const { jobId } = context.params;
    const jobData = snapshot.data();
    const jobRef = snapshot.ref;
    logger.info(`[${jobId}] Job triggered`);
    if (jobData.status !== "queued") {
        logger.warn(`[${jobId}] Not queued. Ignoring.`);
        return;
    }
    await jobRef.update({
        status: "processing",
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        logger.error(`[${jobId}] GOOGLE_GENAI_API_KEY no está configurada en el entorno de la función.`);
        await jobRef.update({
            status: "error",
            errorMessage: "La clave de API de Google no está configurada en el servidor.",
        });
        return;
    }
    try {
        const { pdfDataUri, notas, sourceFileName } = jobData;
        if (!pdfDataUri)
            throw new Error("pdfDataUri vacío.");
        const match = pdfDataUri.match(/^data:(application\/pdf);base64,(.*)$/);
        if (!match)
            throw new Error("Formato inválido: data:application/pdf;base64,...");
        const mimeType = match[1];
        const base64Data = match[2];
        const prompt = `
Eres un experto analista de itemizados de construcción.
Analiza el PDF entregado y genera un JSON válido siguiendo estas reglas:
- chapters[]: lista de capítulos principales detectados.
- rows[]:
  * type: "chapter" | "subchapter" | "item"
  * id: "1", "1.1", "1.1.1", etc.
  * parentId: id del contenedor superior o null.
  * chapterIndex: índice del capítulo.
  * codigo, descripcion, unidad, cantidad, precioUnitario, total: si no existe → null.
- meta.sourceFileName = "${sourceFileName || "N/A"}"
- No inventes valores.
Notas:
${notas || "Sin notas."}
Entrega SOLO un JSON válido, sin texto adicional.
`;
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: base64Data,
                            },
                        },
                    ],
                },
            ],
            generationConfig: {
                response_mime_type: "application/json",
            },
        };
        const response = await (0, node_fetch_1.default)(geminiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            const err = await response.json();
            const errorAny = err;
            throw new Error(errorAny.response?.data?.error?.message || errorAny.message || "Error desconocido en API Gemini");
        }
        const result = await response.json();
        const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawJson)
            throw new Error("Gemini no retornó texto JSON.");
        const parsed = JSON.parse(rawJson);
        await jobRef.update({
            status: "done",
            result: parsed,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(`[${jobId}] Job completado OK`);
    }
    catch (err) {
        logger.error(`[${jobId}] Error`, err);
        const errorAny = err;
        const mensajeError = errorAny.response?.data?.error?.message || errorAny.message || "Error desconocido";
        await jobRef.update({
            status: "error",
            errorMessage: `Fallo en Gemini: ${mensajeError}`,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
});
//# sourceMappingURL=processItemizadoJob.js.map