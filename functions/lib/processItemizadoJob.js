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
// Inicializar Firebase Admin SDK si no se ha hecho
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
exports.processItemizadoJob = (0, firestore_1.onDocumentCreated)({
    document: "itemizadoImportJobs/{jobId}",
    // La región y SA se heredan de setGlobalOptions
    cpu: 1,
    memory: "512MiB",
    timeoutSeconds: 540,
}, async (event) => {
    // --- Carga diferida (Lazy Load) de Genkit y sus dependencias ---
    // Esto se ejecuta solo cuando la función está en la nube, no durante el deploy.
    const { ai } = await Promise.resolve().then(() => __importStar(require("./genkit-config")));
    const { z } = await Promise.resolve().then(() => __importStar(require('zod')));
    const { ItemizadoImportOutputSchema } = await Promise.resolve().then(() => __importStar(require('./types/itemizados-import')));
    const { jobId } = event.params;
    const snapshot = event.data;
    if (!snapshot) {
        logger.warn(`[${jobId}] No se encontraron datos en el evento. Abortando.`);
        return;
    }
    const jobData = snapshot.data();
    const jobRef = snapshot.ref;
    // GUARD: Evitar dobles ejecuciones
    if (jobData.status !== 'queued') {
        logger.info(`[${jobId}] El trabajo no está en estado 'queued' (estado actual: ${jobData.status}). Ignorando.`);
        return;
    }
    logger.info(`[${jobId}] Nuevo trabajo de importación recibido. Iniciando procesamiento...`);
    try {
        // 1. Marcar el trabajo como "procesando"
        await jobRef.update({ status: "processing" });
        // Definir el esquema de entrada aquí, dentro de la función.
        const ImportarItemizadoInputSchema = z.object({
            pdfDataUri: z.string(),
            obraId: z.string(),
            obraNombre: z.string(),
            notas: z.string().optional(),
        });
        // Definir el prompt y el flow aquí, para que solo se registren en runtime.
        const importarItemizadoPrompt = ai.definePrompt({
            name: 'importarItemizadoPrompt',
            model: 'googleai/gemini-2.5-flash',
            input: { schema: ImportarItemizadoInputSchema },
            output: { schema: ItemizadoImportOutputSchema },
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
      9.  Tu respuesta DEBE SER EXCLUSIVAMENTE un objeto JSON válido, sin texto adicional, explicaciones ni formato markdown (sin bloques de código).
      
      Aquí está la información proporcionada por el usuario:
      - Itemizado PDF: {{media url=pdfDataUri}}
      - Notas adicionales: {{{notas}}}
      
      Genera ahora el JSON de salida.`
        });
        const importarItemizadoFlow = ai.defineFlow({
            name: 'importarItemizadoCloudFunctionFlow',
            inputSchema: ImportarItemizadoInputSchema,
            outputSchema: ItemizadoImportOutputSchema,
        }, async (input) => {
            logger.info("[Genkit Flow] Iniciando análisis de itemizado...");
            const { output } = await importarItemizadoPrompt(input);
            if (!output) {
                throw new Error("La IA no devolvió una respuesta válida para el itemizado.");
            }
            logger.info("[Genkit Flow] Análisis completado con éxito.");
            return output;
        });
        // 2. Validar los datos de entrada del documento
        const parsedInput = ImportarItemizadoInputSchema.safeParse(jobData);
        if (!parsedInput.success) {
            throw new Error(`Los datos del trabajo son inválidos: ${JSON.stringify(parsedInput.error.flatten())}`);
        }
        const { pdfDataUri, obraId, obraNombre, notas } = parsedInput.data;
        // 3. Ejecutar el flujo de Genkit para el análisis de IA
        logger.info(`[${jobId}] Llamando al flujo de Genkit para la obra ${obraNombre}...`);
        const analisisResult = await importarItemizadoFlow({
            pdfDataUri,
            obraId,
            obraNombre,
            notas: notas || "Analizar el itemizado completo."
        });
        // 4. Guardar el resultado exitoso en Firestore
        logger.info(`[${jobId}] El análisis de IA fue exitoso. Guardando resultados...`);
        await jobRef.update({
            status: "done",
            result: analisisResult,
            processedAt: (0, firestore_2.serverTimestamp)(),
        });
        logger.info(`[${jobId}] Trabajo completado y guardado.`);
    }
    catch (error) {
        logger.error(`[${jobId}] Error catastrófico durante el procesamiento:`, error);
        // 5. Guardar el estado de error en Firestore
        await jobRef.update({
            status: "error",
            errorMessage: error.message || "Ocurrió un error desconocido durante el análisis.",
            processedAt: (0, firestore_2.serverTimestamp)(),
        });
    }
});
//# sourceMappingURL=processItemizadoJob.js.map