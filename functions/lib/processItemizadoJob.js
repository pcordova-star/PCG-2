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
const genkit_config_1 = require("./genkit-config");
const itemizados_import_1 = require("./types/itemizados-import"); // Asumimos que los tipos se mueven aquí
const zod_1 = require("zod");
const ImportarItemizadoInputSchema = zod_1.z.object({
    pdfDataUri: zod_1.z.string(),
    obraId: zod_1.z.string(),
    obraNombre: zod_1.z.string(),
    notas: zod_1.z.string().optional(),
});
const importarItemizadoPrompt = genkit_config_1.ai.definePrompt({
    name: 'importarItemizadoPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: ImportarItemizadoInputSchema },
    output: { schema: itemizados_import_1.ItemizadoImportOutputSchema },
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
exports.processItemizadoJob = (0, firestore_1.onDocumentCreated)("itemizadoImportJobs/{jobId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        logger.log("No data associated with the event");
        return;
    }
    const jobData = snapshot.data();
    const jobId = event.params.jobId;
    const db = (0, firestore_2.getFirestore)();
    try {
        logger.log(`Processing job: ${jobId}`);
        // Marcar como 'processing'
        await db.collection("itemizadoImportJobs").doc(jobId).update({ status: "processing" });
        // Preparar el input para el flujo de IA
        const inputForAI = {
            pdfDataUri: jobData.pdfDataUri,
            obraId: jobData.obraId,
            obraNombre: jobData.obraNombre,
            notas: jobData.notas,
        };
        // Llamar al flujo de IA
        const { output } = await importarItemizadoPrompt(inputForAI);
        if (!output) {
            throw new Error("La IA no devolvió una respuesta válida para el itemizado.");
        }
        // Marcar como 'done' y guardar el resultado
        await db.collection("itemizadoImportJobs").doc(jobId).update({
            status: "done",
            result: output,
            finishedAt: new Date(),
        });
        logger.log(`Job ${jobId} completed successfully.`);
    }
    catch (error) {
        logger.error(`Job ${jobId} failed:`, error);
        // Marcar como 'error'
        await db.collection("itemizadoImportJobs").doc(jobId).update({
            status: "error",
            errorMessage: error.message || "Ocurrió un error desconocido.",
            finishedAt: new Date(),
        });
    }
});
//# sourceMappingURL=processItemizadoJob.js.map