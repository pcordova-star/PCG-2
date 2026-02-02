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
        const { notas, obraNombre } = jobData;
        const apiKey = process.env.GOOGLE_GENAI_API_KEY;
        if (!apiKey) {
            throw new Error("GOOGLE_GENAI_API_KEY no está configurada en el entorno de la función.");
        }
        const prompt = `Eres un asistente experto en análisis de presupuestos de construcción. Tu tarea es interpretar un presupuesto (en formato PDF) y extraer los capítulos y todas las partidas/subpartidas.

Debes seguir estas reglas estrictamente:

1.  Analiza el documento PDF que se te entrega.
2.  Para CADA LÍNEA del itemizado (capítulos, partidas, sub-partidas), genera un único objeto JSON en una sola línea.
3.  Tu respuesta DEBE SER EXCLUSIVAMENTE una secuencia de objetos JSON, uno por cada línea, sin comas entre ellos y sin un array \`[]\` que los envuelva.
4.  Para cada objeto JSON, incluye los siguientes campos: 'id' (string, ej: "1.2.3"), 'parentId' (string o null), 'type' ('chapter', 'subchapter', 'item'), 'descripcion' (string), 'unidad' (string o null), 'cantidad' (number o null), 'precioUnitario' (number o null), y 'especialidad' (string o null).
5.  NO inventes valores. Si una cantidad o precio no existe para un ítem (ej. en un capítulo), déjalo como 'null'.
6.  NO incluyas saltos de línea dentro de un objeto JSON. Cada objeto debe ocupar exactamente una línea.

Ejemplo de formato de salida esperado:
{"id": "1", "parentId": null, "type": "chapter", "descripcion": "OBRA GRUESA", "unidad": null, "cantidad": null, "precioUnitario": null, "especialidad": "Obra Gruesa"}
{"id": "1.1", "parentId": "1", "type": "item", "descripcion": "Hormigón H-25", "unidad": "m3", "cantidad": 120, "precioUnitario": 95000, "especialidad": "Obra Gruesa"}
{"id": "1.2", "parentId": "1", "type": "item", "descripcion": "Acero A63", "unidad": "kg", "cantidad": 4500, "precioUnitario": 1200, "especialidad": "Obra Gruesa"}

Aquí está la información proporcionada por el usuario:
- Obra: ${obraNombre}
- Itemizado PDF: (adjunto)
- Notas adicionales: ${notas || "Sin notas."}

Genera ahora la secuencia de objetos JSON.`;
        await jobRef.update({ status: 'running_ai', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const requestBody = {
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'application/pdf', data: base64Data } }] }],
            generationConfig: {
            // No se usa response_mime_type: "application/json" porque esperamos un stream de texto
            },
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
        const rawJsonLines = result.candidates?.[0]?.content?.parts?.[0]?.text;
        await jobRef.update({ rawAiResult: rawJsonLines, status: "normalizing_result", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        if (!rawJsonLines)
            throw new Error("La respuesta de Gemini no contiene texto válido.");
        const lines = rawJsonLines.split('\n').filter((line) => line.trim().startsWith('{'));
        const items = [];
        for (const line of lines) {
            try {
                const item = JSON.parse(line);
                items.push(item);
            }
            catch (e) {
                logger.warn(`[${jobId}] No se pudo parsear la línea a JSON, omitiendo. Línea: "${line}"`, e);
            }
        }
        if (items.length === 0) {
            throw new Error("La IA no devolvió ninguna partida válida en el formato de un objeto JSON por línea.");
        }
        await jobRef.update({
            status: "completed",
            result: { items: items }, // Se envuelve el array en el objeto esperado por el frontend
            finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(`[${jobId}] Job completado OK con ${items.length} ítems.`);
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