"use strict";
// functions/src/processItemizadoJob.ts
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
const firestore_1 = require("firebase-functions/v2/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_2 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const zod_1 = require("zod");
const params_1 = require("./params");
const genkit_config_1 = require("./genkit-config");
// Inicializar Firebase Admin SDK si no se ha hecho
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
exports.processItemizadoJob = (0, firestore_1.onDocumentCreated)({
    // 🔴 MUY IMPORTANTE: mantener esta región para no duplicar/borrar la función existente
    region: "us-central1",
    document: "itemizadoImportJobs/{jobId}",
    secrets: [params_1.GEMINI_API_KEY_SECRET],
    cpu: 1,
    memory: "512MiB",
    timeoutSeconds: 540,
}, async (event) => {
    const { jobId } = event.params;
    const snapshot = event.data;
    if (!snapshot) {
        logger.warn(`[${jobId}] No data found in event. Aborting.`);
        return;
    }
    const jobData = snapshot.data();
    const jobRef = snapshot.ref;
    // 1. Observabilidad inicial
    logger.info(`[${jobId}] Job triggered.`, {
        path: snapshot.ref.path,
        currentStatus: jobData.status,
        keys: Object.keys(jobData),
    });
    // GUARD: evitar ejecuciones duplicadas
    if (jobData.status !== "queued") {
        logger.info(`[${jobId}] Job ignored. Current status: ${jobData.status}`);
        return;
    }
    // 2. Marcar como procesando
    try {
        await jobRef.update({
            status: "processing",
            startedAt: firestore_2.FieldValue.serverTimestamp(),
        });
        logger.info(`[${jobId}] Status updated to processing.`);
    }
    catch (err) {
        logger.error(`[${jobId}] Failed to update status to processing.`, err);
        return;
    }
    try {
        // 3. Genkit ya inicializado vía import (usa secret inyectado)
        logger.info(`[${jobId}] Using Genkit AI instance.`);
        const ImportarItemizadoInputSchema = zod_1.z.object({
            pdfDataUri: zod_1.z.string(),
            obraId: zod_1.z.string(),
            obraNombre: zod_1.z.string(),
            notas: zod_1.z.string().optional(),
        });
        const importarItemizadoPrompt = genkit_config_1.ai.definePrompt({
            name: "importarItemizadoPrompt",
            model: "googleai/gemini-2.5-flash",
            input: { schema: ImportarItemizadoInputSchema },
            prompt: `
Eres un asistente experto en análisis de presupuestos de construcción.

Reglas estrictas:
1. Analiza el PDF entregado.
2. Identifica capítulos principales → array "chapters".
3. Procesa TODAS las líneas → array "rows".
4. Cada fila debe tener id estable (ej: 1, 1.1, 1.2.3).
5. parentId define jerarquía (null si es raíz).
6. chapterIndex debe ser consistente.
7. Extrae códigos, descripciones, unidades, cantidades, PU y totales.
8. NO inventes valores. Usa null si no existen.
9. Respuesta EXCLUSIVAMENTE JSON válido.

Entrada:
- PDF: {{media url=pdfDataUri}}
- Notas: {{{notas}}}
        `,
        });
        const importarItemizadoFlow = genkit_config_1.ai.defineFlow({
            name: "importarItemizadoCloudFunctionFlow",
            inputSchema: ImportarItemizadoInputSchema,
        }, async (input) => {
            logger.info(`[${jobId}] Genkit flow started.`);
            const res = await importarItemizadoPrompt(input);
            const output = res?.output ?? res;
            if (!output) {
                throw new Error("AI returned empty output.");
            }
            logger.info(`[${jobId}] Genkit flow completed.`);
            return output;
        });
        const parsedInput = ImportarItemizadoInputSchema.parse(jobData);
        let analisisResult;
        try {
            analisisResult = await importarItemizadoFlow({
                pdfDataUri: parsedInput.pdfDataUri,
                obraId: parsedInput.obraId,
                obraNombre: parsedInput.obraNombre,
                notas: parsedInput.notas ?? "Analizar itemizado completo.",
            });
        }
        catch (flowErr) {
            logger.error(`[${jobId}] Genkit flow failed.`, flowErr);
            await jobRef.update({
                status: "error",
                errorMessage: `FLOW_FAILED: ${flowErr.message}`,
                processedAt: firestore_2.FieldValue.serverTimestamp(),
            });
            return;
        }
        // 4. Guardar resultado
        await jobRef.update({
            status: "done",
            result: analisisResult,
            processedAt: firestore_2.FieldValue.serverTimestamp(),
        });
        logger.info(`[${jobId}] Job completed successfully.`);
    }
    catch (err) {
        logger.error(`[${jobId}] Catastrophic error.`, err);
        try {
            await jobRef.update({
                status: "error",
                errorMessage: err?.message ??
                    "Unexpected error during itemizado processing.",
                processedAt: firestore_2.FieldValue.serverTimestamp(),
            });
        }
        catch (finalErr) {
            logger.error(`[${jobId}] Failed to write final error state.`, finalErr);
        }
    }
});
//# sourceMappingURL=processItemizadoJob.js.map