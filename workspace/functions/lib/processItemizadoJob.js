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
// 1. PROMPT MODIFICADO: Ahora pide un JSON por línea. Es más robusto contra truncamientos.
const streamPrompt = `
Eres un experto en analizar presupuestos de construcción. Tu tarea es interpretar un presupuesto en PDF y extraer CADA partida como un objeto JSON independiente en una nueva línea.

REGLAS ESTRICTAS:
1. Analiza el documento PDF adjunto.
2. Por CADA LÍNEA del itemizado (capítulos, partidas, etc.), genera un ÚNICO objeto JSON en una nueva línea.
3. NO envuelvas los objetos en un array JSON ([...]).
4. NO pongas comas entre los objetos JSON de cada línea.
5. Cada línea DEBE ser un JSON válido e independiente.
6. La estructura de cada objeto JSON debe ser:
   {
     "id": "ID jerárquico único (ej: '1', '1.1', '1.2.3')",
     "parentId": "ID del padre o null si es raíz",
     "type": "'chapter', 'subchapter', o 'item'",
     "descripcion": "Descripción completa de la partida",
     "unidad": "Unidad de medida (ej: m2, ml) o null",
     "cantidad": "Cantidad numérica o null",
     "precioUnitario": "Precio unitario numérico o null",
     "especialidad": "Nombre del capítulo principal al que pertenece"
   }
7. Si un valor no existe, usa 'null'. No inventes datos.`;
/**
 * Llama a la API de Gemini y devuelve la respuesta de texto crudo.
 */
async function callGeminiAPI(apiKey, model, prompt, fileBuffer) {
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const base64Data = fileBuffer.toString('base64');
    const response = await (0, node_fetch_1.default)(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'application/pdf', data: base64Data } }] }],
        }),
    });
    if (!response.ok) {
        const errText = await response.text();
        logger.error(`Gemini API error (${model}):`, errText);
        throw new Error(`Error en API Gemini: ${response.statusText}`);
    }
    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText)
        throw new Error(`La respuesta de Gemini (${model}) no contiene texto.`);
    return rawText;
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
        await jobRef.update({ status: "processing", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        const storageBucket = admin.storage().bucket(bucket);
        const file = storageBucket.file(filePath);
        const [pdfBuffer] = await file.download();
        await jobRef.update({ status: 'running_ai', statusDetail: 'Analizando documento con IA...', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        // 1. Obtener la respuesta de la IA como un bloque de texto.
        const rawResultText = await callGeminiAPI(apiKey, 'gemini-2.0-flash', streamPrompt, pdfBuffer);
        await jobRef.update({ status: 'normalizing_result', statusDetail: 'Procesando resultados...', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        // 2. Procesar el texto línea por línea.
        const lines = rawResultText.split('\n').filter(line => line.trim().startsWith('{'));
        const finalItems = [];
        let errors = 0;
        for (const line of lines) {
            try {
                // Intenta parsear cada línea como un JSON independiente.
                const item = JSON.parse(line);
                finalItems.push(item);
            }
            catch (e) {
                errors++;
                logger.warn(`[${jobId}] Error al parsear línea JSON, se omite: ${line}`, e);
            }
        }
        if (finalItems.length === 0 && errors > 0) {
            throw new Error(`El análisis de la IA falló. No se pudo parsear ninguna línea de la respuesta.`);
        }
        if (errors > 0) {
            logger.warn(`[${jobId}] Se encontraron ${errors} líneas con formato JSON inválido que fueron omitidas.`);
        }
        // 3. Guardar el resultado agregado.
        await jobRef.update({
            status: "completed",
            result: { items: finalItems, parsingErrors: errors },
            finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(`[${jobId}] Job completado. Items extraídos: ${finalItems.length}, Errores de parseo: ${errors}`);
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