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
const firestore_1 = require("firebase-functions/v2/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_2 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const zod_1 = require("zod");
// Inicializar Firebase Admin SDK si no se ha hecho
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
exports.processItemizadoJob = (0, firestore_1.onDocumentCreated)({
    document: "itemizadoImportJobs/{jobId}",
    cpu: 1,
    memory: "1GiB",
    timeoutSeconds: 300,
}, async (event) => {
    const { jobId } = event.params;
    // Log de seguridad para verificar la presencia de la API key en cada ejecución
    const apiKeyExists = !!process.env["GEMINI_API_KEY"];
    logger.info(`[${jobId}] Verificación de API Key en handler: Existe=${apiKeyExists}, Longitud=${process.env["GEMINI_API_KEY"]?.length || 0}`);
    const snapshot = event.data;
    if (!snapshot) {
        logger.warn(`[${jobId}] No data found in event. Aborting.`);
        return;
    }
    const jobData = snapshot.data();
    const jobRef = snapshot.ref;
    // 1. Logging inicial para observabilidad
    logger.info(`[${jobId}] Job triggered.`, {
        location: event.location,
        path: snapshot.ref.path,
        jobKeys: Object.keys(jobData),
        currentStatus: jobData.status,
    });
    // GUARD: Evitar dobles ejecuciones
    if (jobData.status !== 'queued') {
        logger.info(`[${jobId}] Job is not in 'queued' state (current: ${jobData.status}). Ignoring.`);
        return;
    }
    // 2. Marcar el trabajo como "procesando" de forma segura
    try {
        await jobRef.update({
            status: "processing",
            startedAt: firestore_2.FieldValue.serverTimestamp()
        });
        logger.info(`[${jobId}] Job status updated to 'processing'.`);
    }
    catch (updateError) {
        logger.error(`[${jobId}] FATAL: Could not update job status to 'processing'. Aborting.`, updateError);
        return; // Salir si no podemos ni siquiera marcar el inicio
    }
    try {
        // 3. Carga diferida (Lazy Load) de Genkit y sus dependencias
        let ai;
        try {
            const genkitModule = await Promise.resolve().then(() => __importStar(require("./genkit-config")));
            ai = genkitModule.ai;
            logger.info(`[${jobId}] Genkit module imported successfully.`);
        }
        catch (genkitError) {
            logger.error(`[${jobId}] CRITICAL: Failed to import Genkit module.`, genkitError);
            await jobRef.update({
                status: "error",
                errorMessage: `GENKIT_IMPORT_FAILED: ${genkitError.message}`,
                processedAt: firestore_2.FieldValue.serverTimestamp(),
            });
            return;
        }
        const ImportarItemizadoInputSchema = zod_1.z.object({
            pdfDataUri: zod_1.z.string(),
            obraId: zod_1.z.string(),
            obraNombre: zod_1.z.string(),
            notas: zod_1.z.string().optional(),
        });
        const importarItemizadoPrompt = ai.definePrompt({
            name: 'importarItemizadoPrompt',
            model: 'googleai/gemini-2.5-flash',
            input: { schema: ImportarItemizadoInputSchema },
            prompt: `Eres un asistente experto en análisis de presupuestos de construcción. Tu tarea es interpretar un presupuesto (en formato PDF) y extraer los capítulos y todas las partidas/subpartidas en una estructura plana.

Debes seguir estas reglas estrictamente:

1.  Analiza el documento PDF que se te entrega.
2.  Primero, identifica los capítulos principales y llena el array 'chapters'.
3.  Luego, procesa CADA LÍNEA del itemizado (capítulos, partidas, sub-partidas) y conviértela en un objeto para el array 'rows'.
4.  Para cada fila en 'rows', genera un 'id' estable y único (ej: "1", "1.1", "1.2.3").
5.  Para representar la jerarquía, asigna el 'id' del elemento padre al campo 'parentId'. Si un ítem es de primer nivel (dentro de un capítulo), su 'parentId' debe ser 'null'.
6.  Asigna el 'chapterIndex' correcto a cada fila, correspondiendo a su capítulo en el array 'chapters'.
7.  Extrae códigos, descripciones, unidades, cantidades, precios unitarios y totales para cada partida.
8.  NO inventes cantidades, precios ni unidades si no están explícitamente en el documento. Si un valor no existe para un ítem, déjalo como 'null'.
9.  Tu respuesta DEBE SER EXCLUSIVAMENTE un objeto JSON válido, sin texto adicional, explicaciones ni formato markdown.

Aquí está la información proporcionada por el usuario:
- Itemizado PDF: {{media url=pdfDataUri}}
- Notas adicionales: {{{notas}}}

Genera ahora el JSON de salida.`
        });
        const importarItemizadoFlow = ai.defineFlow({
            name: 'importarItemizadoCloudFunctionFlow',
            inputSchema: ImportarItemizadoInputSchema,
        }, async (input) => {
            logger.info("[Genkit Flow] Iniciando análisis de itemizado...");
            const res = await importarItemizadoPrompt(input);
            const output = res?.output ?? res;
            if (!output) {
                throw new Error("La IA no devolvió una respuesta válida para el itemizado.");
            }
            logger.info("[Genkit Flow] Análisis completado con éxito.");
            return output;
        });
        const parsedInput = ImportarItemizadoInputSchema.parse(jobData);
        let analisisResult;
        try {
            logger.info(`[${jobId}] Calling Genkit flow for obra ${parsedInput.obraNombre}...`);
            analisisResult = await importarItemizadoFlow({
                pdfDataUri: parsedInput.pdfDataUri,
                obraId: parsedInput.obraId,
                obraNombre: parsedInput.obraNombre,
                notas: parsedInput.notas || "Analizar el itemizado completo.",
            });
        }
        catch (flowError) {
            logger.error(`[${jobId}] Genkit flow execution failed.`, flowError);
            await jobRef.update({
                status: "error",
                errorMessage: `FLOW_FAILED: ${flowError.message}`,
                processedAt: firestore_2.FieldValue.serverTimestamp(),
            });
            return;
        }
        logger.info(`[${jobId}] AI analysis successful. Saving results...`);
        await jobRef.update({
            status: "done",
            result: analisisResult,
            processedAt: firestore_2.FieldValue.serverTimestamp(),
        });
        logger.info(`[${jobId}] Job completed and saved.`);
    }
    catch (error) {
        logger.error(`[${jobId}] Catastrophic error during processing:`, error);
        try {
            await jobRef.update({
                status: "error",
                errorMessage: error.message || "Ocurrió un error desconocido durante el análisis.",
                processedAt: firestore_2.FieldValue.serverTimestamp(),
            });
        }
        catch (finalError) {
            logger.error(`[${jobId}] CRITICAL: Failed to even update a final error state.`, finalError);
        }
    }
});
