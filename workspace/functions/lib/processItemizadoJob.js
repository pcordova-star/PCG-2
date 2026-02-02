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
function cleanJsonString(rawString) {
    let cleaned = rawString.replace(/```json/g, "").replace(/```/g, "");
    // Eliminar comentarios de una línea o de bloque
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
    const startIndex = cleaned.indexOf("[");
    const endIndex = cleaned.lastIndexOf("]");
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error("Respuesta de IA no contenía un array JSON válido `[...]`.");
    }
    cleaned = cleaned.substring(startIndex, endIndex + 1);
    // Eliminar comas sobrantes antes de corchetes de cierre.
    cleaned = cleaned.replace(/,\s*]/g, "]");
    return cleaned;
}
exports.processPresupuestoPdf = (0, storage_1.onObjectFinalized)({ memory: "2GiB", timeoutSeconds: 540, secrets: ["GOOGLE_GENAI_API_KEY"] }, async (event) => {
    const { bucket, name: filePath } = event.data;
    if (!filePath || !filePath.startsWith('itemizados/') || !filePath.endsWith('.pdf')) {
        logger.log(`[IGNORE] File ${filePath} is not a presupuesto PDF.`);
        return;
    }
    const pathParts = filePath.split("/");
    const jobId = pathParts[pathParts.length - 1].replace(".pdf", "");
    if (!jobId) {
        logger.error("Could not extract jobId from file path:", filePath);
        return;
    }
    const jobRef = db.collection('itemizadoImportJobs').doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) {
        logger.error(`[${jobId}] Job document not found in Firestore.`);
        return;
    }
    const jobData = jobSnap.data();
    if (jobData.status !== "uploaded") {
        logger.warn(`[${jobId}] Job not in 'uploaded' state (current: ${jobData.status}). Ignoring trigger.`);
        return;
    }
    try {
        await jobRef.update({ status: "processing", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        const storageBucket = admin.storage().bucket(bucket);
        const file = storageBucket.file(filePath);
        const [buffer] = await file.download();
        const base64Data = buffer.toString('base64');
        const { notas } = jobData;
        const apiKey = process.env.GOOGLE_GENAI_API_KEY;
        if (!apiKey) {
            throw new Error("GOOGLE_GENAI_API_KEY no está configurada en el entorno de la función.");
        }
        const prompt = `Eres un analista de costos y presupuestos de construcción en Chile. Tu tarea es interpretar un presupuesto de obra en formato PDF y transformarlo en un array de objetos JSON.

REGLAS DE ORO:
- Tu respuesta debe ser EXCLUSIVAMENTE un array JSON, comenzando con [ y terminando con ].
- NO envuelvas el array en un objeto como {"items": [...]}. Solo el array.
- Cada objeto dentro del array representa una línea del presupuesto (capítulo, subpartida o ítem).
- Si un valor numérico (cantidad, precio) no aparece, usa 'null', no 0.

ESTRUCTURA DE CADA OBJETO DENTRO DEL ARRAY:
{
  "id": "string",            // Un código jerárquico único (ej: "1", "1.1", "1.1.1")
  "parentId": "string|null", // El 'id' del padre, o null si es un capítulo raíz
  "type": "'chapter'|'subchapter'|'item'",
  "descripcion": "string",
  "unidad": "string|null",
  "cantidad": "number|null",
  "precioUnitario": "number|null",
  "especialidad": "string|null"
}

Notas del usuario:
${notas || "Sin notas."}

A continuación, el PDF para analizar. Genera el array JSON.`;
        await jobRef.update({ status: 'running_ai', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const requestBody = {
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'application/pdf', data: base64Data } }] }],
            generationConfig: { response_mime_type: "application/json" },
        };
        const response = await (0, node_fetch_1.default)(geminiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            const errText = await response.text();
            logger.error(`[${jobId}] Gemini API error:`, errText);
            throw new Error(`Error en API Gemini: ${response.statusText}`);
        }
        const result = await response.json();
        const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;
        await jobRef.update({ rawAiResult: rawJson, status: "normalizing_result", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        if (!rawJson)
            throw new Error("La respuesta de Gemini no contiene texto JSON válido.");
        let parsed;
        try {
            const items = JSON.parse(cleanJsonString(rawJson));
            if (!Array.isArray(items)) {
                throw new Error("La IA no devolvió un array. Se recibió un objeto en su lugar.");
            }
            // Envuelvo el array en la estructura que espera mi aplicación
            parsed = { items };
        }
        catch (e) {
            const snippet = rawJson.substring(0, 500);
            throw new Error(`La IA devolvió un JSON inválido. Error de parseo: ${e.message}. Comienzo de la respuesta: "${snippet}..."`);
        }
        if (!parsed.items || parsed.items.length === 0) {
            throw new Error("La respuesta de la IA no contiene un array 'items' válido o está vacío.");
        }
        await jobRef.update({
            status: "completed",
            result: parsed,
            finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(`[${jobId}] Job completado OK.`);
    }
    catch (err) {
        logger.error(`[${jobId}] Error processing job:`, err);
        await jobRef.update({
            status: 'error',
            errorMessage: err.message || "Error desconocido durante el procesamiento.",
            finishedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
});
//# sourceMappingURL=processItemizadoJob.js.map