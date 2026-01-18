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
Object.defineProperty(exports, "__esModule", { value: true });
exports.processItemizadoJob = void 0;
// functions/src/processItemizadoJob.ts
const functions = __importStar(require("firebase-functions"));
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const adminApp = (0, firebaseAdmin_1.getAdminApp)();
const db = adminApp.firestore();
const storage = adminApp.storage();
exports.processItemizadoJob = functions
    .region("us-central1")
    .runWith({ timeoutSeconds: 540, memory: "1GB" })
    .firestore
    .document("itemizadoImportJobs/{jobId}")
    .onCreate(async (snapshot, context) => {
    const { jobId } = context.params;
    const jobData = snapshot.data();
    const jobRef = snapshot.ref;
    logger.info(`[${jobId}] Job triggered.`, { path: snapshot.ref.path });
    if (jobData.status !== 'queued') {
        logger.warn(`[${jobId}] Job is not 'queued'. Ignoring.`);
        return;
    }
    try {
        await jobRef.update({ status: "processing", startedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
    catch (updateError) {
        logger.error(`[${jobId}] FATAL: Could not update job status.`, updateError);
        return;
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        logger.error(`[${jobId}] GEMINI_API_KEY not configured.`);
        await jobRef.update({ status: 'error', errorMessage: 'API Key no configurada en el servidor.' });
        return;
    }
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    try {
        const { pdfDataUri, obraNombre, notas, sourceFileName } = jobData;
        if (!pdfDataUri)
            throw new Error("pdfDataUri no encontrado en el job.");
        const match = pdfDataUri.match(/^data:(application\/pdf);base64,(.*)$/);
        if (!match)
            throw new Error("El formato de pdfDataUri es inválido. Se esperaba 'data:application/pdf;base64,...'.");
        const mimeType = match[1];
        const base64Data = match[2];
        const prompt = `Eres un asistente experto en análisis de presupuestos de construcción. Tu tarea es interpretar un presupuesto (en formato PDF) y extraer los capítulos y todas las partidas/subpartidas en una estructura plana.

Debes seguir estas reglas estrictamente:

1.  Analiza el documento PDF que se te entrega.
2.  Primero, identifica los capítulos principales y llena el array 'chapters'.
3.  Luego, procesa CADA LÍNEA del itemizado y conviértela en un objeto para el array 'rows'.
    - Si la línea es un título principal, asigna type: "chapter".
    - Si es un subtítulo o una actividad general bajo un capítulo, asigna type: "subchapter".
    - Si es una partida de trabajo con cantidad y precio, asigna type: "item".
4.  Para cada fila en 'rows', genera un 'id' estable y único (ej: "1", "1.1", "1.2.3").
5.  Para representar la jerarquía, asigna el 'id' del elemento padre al campo 'parentId'. Si un ítem es de primer nivel (dentro de un capítulo), su 'parentId' debe ser 'null'.
6.  Asigna el 'chapterIndex' correcto a cada fila, correspondiendo a su capítulo en el array 'chapters'.
7.  Extrae códigos, descripciones, unidades, cantidades, precios unitarios y totales para cada partida.
8.  NO inventes cantidades, precios ni unidades si no están explícitamente en el documento. Si un valor no existe para un ítem, déjalo como 'null'.
9.  En el campo 'meta.sourceFileName', incluye el nombre del archivo original que se te proporciona.
10. Tu respuesta DEBE SER EXCLUSIVAMENTE un objeto JSON válido, sin texto adicional, explicaciones ni formato markdown.

Aquí está la información proporcionada por el usuario:
- Nombre del archivo: ${sourceFileName || 'N/A'}
- Notas adicionales: ${notas || 'Sin notas.'}

Genera ahora el JSON de salida.`;
        const requestBody = {
            contents: [{
                    parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }]
                }],
            generationConfig: { response_mime_type: "application/json" }
        };
        const response = await fetch(geminiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`API Error: ${errorBody.error?.message || response.statusText}`);
        }
        const responseData = await response.json();
        const textResponse = responseData.candidates[0].content.parts[0].text;
        const parsedResult = JSON.parse(textResponse);
        await jobRef.update({
            status: 'done',
            result: parsedResult,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(`[${jobId}] Job completado exitosamente.`);
    }
    catch (error) {
        logger.error(`[${jobId}] Error durante el procesamiento:`, error);
        await jobRef.update({
            status: 'error',
            errorMessage: error.message,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
});
//# sourceMappingURL=processItemizadoJob.js.map