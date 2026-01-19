"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processItemizadoJob = void 0;
// functions/src/processItemizadoJob.ts
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const node_fetch_1 = require("node-fetch");
const firebaseAdmin_1 = require("./firebaseAdmin");
const adminApp = (0, firebaseAdmin_1.getAdminApp)();
const db = adminApp.firestore();
exports.processItemizadoJob = functions
    .region("us-central1")
    .runWith({ timeoutSeconds: 540, memory: "1GB" })
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
    // Set processing
    await jobRef.update({
        status: "processing",
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // API KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        logger.error(`[${jobId}] Missing GEMINI_API_KEY`);
        await jobRef.update({
            status: "error",
            errorMessage: "GEMINI_API_KEY no configurada.",
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
        // Prompt clásico (sin Genkit)
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
        const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
            apiKey;
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
            throw new Error(err.error?.message || "Error desconocido en API Gemini");
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
        await jobRef.update({
            status: "error",
            errorMessage: err.message || "Error inesperado",
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
});
//# sourceMappingURL=processItemizadoJob.js.map