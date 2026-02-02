"use strict";
// workspace/functions/src/processItemizadoJob.ts
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
exports.processPresupuestoPdf = void 0;
const storage_1 = require("firebase-functions/v2/storage");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const node_fetch_1 = __importDefault(require("node-fetch"));
const db = (0, firebaseAdmin_1.getAdminApp)().firestore();
// --- Prompts para la arquitectura de dos fases ---
const indexPrompt = `
Eres un experto en analizar presupuestos de construcción. Tu ÚNICA tarea es identificar la estructura del documento.
Analiza el PDF y devuelve SOLAMENTE un objeto JSON con la siguiente estructura:
{
  "chapters": [
    {
      "name": "Nombre del capítulo principal (ej: Obra Gruesa)",
      "items": [
        "Descripción completa de la primera partida",
        "Descripción completa de la segunda partida",
        ...
      ]
    }
  ]
}
NO incluyas precios, cantidades ni unidades. SOLO la estructura jerárquica de capítulos y partidas.
Tu respuesta DEBE ser EXCLUSIVAMENTE el objeto JSON.
`;
const detailPromptTemplate = `
Eres un experto en extraer datos de presupuestos.
Analiza el PDF adjunto y encuentra la partida EXACTA con la descripción "{{itemName}}" dentro del capítulo "{{chapterName}}".
Devuelve SOLAMENTE un objeto JSON con los siguientes datos para ESA partida específica:
{
  "unit": "la unidad (ej: m2, kg, ml)",
  "quantity": el número de la cantidad (ej: 150.5),
  "unit_price": el número del precio unitario (ej: 25000)
}
Si un valor no se encuentra, déjalo como null. Tu respuesta DEBE ser EXCLUSIVAMENTE el objeto JSON.
`;
/**
 * Limpia una cadena que se espera contenga JSON, eliminando los delimitadores de markdown
 * y extrayendo solo el objeto JSON principal.
 */
function cleanJsonString(rawString) {
    let cleaned = rawString.replace(/```json/g, "").replace(/```/g, "");
    const startIndex = cleaned.indexOf("{");
    const endIndex = cleaned.lastIndexOf("}");
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error("No se encontró un objeto JSON válido en la respuesta de la IA.");
    }
    return cleaned.substring(startIndex, endIndex + 1);
}
/**
 * Llama a la API de Gemini con un prompt y un buffer de datos.
 */
async function callGeminiAPI(apiKey, model, prompt, fileBuffer) {
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const base64Data = fileBuffer.toString('base64');
    const response = await (0, node_fetch_1.default)(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'application/pdf', data: base64Data } }] }],
            generationConfig: { response_mime_type: "application/json" },
        }),
    });
    if (!response.ok) {
        const errText = await response.text();
        logger.error(`Gemini API error (${model}):`, errText);
        throw new Error(`Error en API Gemini: ${response.statusText}`);
    }
    const result = await response.json();
    const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson)
        throw new Error(`La respuesta de Gemini (${model}) no contiene texto JSON válido.`);
    const cleanedJson = cleanJsonString(rawJson);
    return JSON.parse(cleanedJson);
}
exports.processPresupuestoPdf = (0, storage_1.onObjectFinalized)({ memory: "2GiB", timeoutSeconds: 540, secrets: ["GOOGLE_GENAI_API_KEY"] }, async (event) => {
    const { bucket, name: filePath } = event.data;
    if (!filePath || !filePath.startsWith('itemizados/') || !filePath.endsWith('.pdf')) {
        logger.log(`[IGNORE] File ${filePath} is not a presupuesto PDF.`);
        return;
    }
    const jobId = filePath.split("/").pop().replace(".pdf", "");
    const jobRef = db.collection('itemizadoImportJobs').doc(jobId);
    try {
        const jobSnap = await jobRef.get();
        if (!jobSnap.exists) {
            throw new Error(`Job document ${jobId} not found.`);
        }
        const jobData = jobSnap.data();
        if (jobData.status !== "uploaded") {
            logger.warn(`[${jobId}] Job not in 'uploaded' state. Current: ${jobData.status}. Aborting.`);
            return;
        }
        const apiKey = process.env.GOOGLE_GENAI_API_KEY;
        if (!apiKey) {
            throw new Error("GOOGLE_GENAI_API_KEY no está configurada.");
        }
        // --- INICIO DEL PROCESO ---
        await jobRef.update({ status: "processing", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        const storageBucket = admin.storage().bucket(bucket);
        const file = storageBucket.file(filePath);
        const [pdfBuffer] = await file.download();
        // --- FASE 1: OBTENER ÍNDICE ---
        await jobRef.update({ status: 'running_ai', statusDetail: 'Fase 1: Analizando estructura...', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        const indexResult = await callGeminiAPI(apiKey, 'gemini-2.0-flash', indexPrompt, pdfBuffer);
        if (!indexResult.chapters || !Array.isArray(indexResult.chapters)) {
            throw new Error("La respuesta del índice de la IA no contiene la estructura 'chapters' esperada.");
        }
        // --- FASE 2: OBTENER DETALLES ---
        const finalItems = [];
        let chapterIndex = 0;
        for (const chapter of indexResult.chapters) {
            chapterIndex++;
            // Añadir el capítulo a la lista final
            const chapterId = `${chapterIndex}`;
            finalItems.push({
                id: chapterId,
                parentId: null,
                type: 'chapter',
                descripcion: chapter.name,
                unidad: null,
                cantidad: null,
                precioUnitario: null,
                especialidad: chapter.name
            });
            let itemIndex = 0;
            for (const itemName of chapter.items) {
                itemIndex++;
                await jobRef.update({
                    status: 'running_ai',
                    statusDetail: `Fase 2: Extrayendo partida ${itemIndex}/${chapter.items.length} de '${chapter.name}'...`
                });
                const detailPrompt = detailPromptTemplate
                    .replace('{{itemName}}', itemName)
                    .replace('{{chapterName}}', chapter.name);
                try {
                    const detailResult = await callGeminiAPI(apiKey, 'gemini-2.0-flash', detailPrompt, pdfBuffer);
                    finalItems.push({
                        id: `${chapterId}.${itemIndex}`,
                        parentId: chapterId,
                        type: 'item',
                        descripcion: itemName,
                        unidad: detailResult.unit || 's/u',
                        cantidad: detailResult.quantity || null,
                        precioUnitario: detailResult.unit_price || null,
                        especialidad: chapter.name
                    });
                }
                catch (itemError) {
                    logger.warn(`[${jobId}] Error extrayendo detalles para '${itemName}': ${itemError.message}. Omitiendo partida.`);
                    // Opcional: añadir un item de error a la lista final para notificar al usuario
                    finalItems.push({
                        id: `${chapterId}.${itemIndex}`,
                        parentId: chapterId,
                        type: 'item',
                        descripcion: `${itemName} (ERROR DE EXTRACCIÓN)`,
                        unidad: null,
                        cantidad: null,
                        precioUnitario: null,
                        especialidad: chapter.name
                    });
                }
            }
        }
        // --- FINALIZACIÓN ---
        await jobRef.update({
            status: "completed",
            result: { items: finalItems },
            finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(`[${jobId}] Job completado OK con arquitectura de dos fases. Total de items: ${finalItems.length}`);
    }
    catch (err) {
        logger.error(`[${jobId}] Error fatal en processItemizadoJob:`, err);
        await jobRef.update({
            status: 'error',
            errorMessage: err.message || "Error desconocido durante el procesamiento.",
            finishedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
});
//# sourceMappingURL=processItemizadoJob.js.map