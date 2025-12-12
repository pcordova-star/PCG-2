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
const zod_1 = require("zod");
const ImportarItemizadoInputSchema = zod_1.z.object({
    pdfDataUri: zod_1.z.string(),
    obraId: zod_1.z.string(),
    obraNombre: zod_1.z.string(),
    notas: zod_1.z.string().optional(),
});
// TEMP: Disabled to avoid TS deep type instantiation during build
const importarItemizadoPrompt = null;
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
        await db.collection("itemizadoImportJobs").doc(jobId).update({ status: "processing" });
        const inputForAI = {
            pdfDataUri: jobData.pdfDataUri,
            obraId: jobData.obraId,
            obraNombre: jobData.obraNombre,
            notas: jobData.notas,
        };
        // Throw a controlled error because the prompt is temporarily disabled.
        throw new Error("processItemizadoJob temporalmente deshabilitado para deploy (TS deep types en Genkit).");
        /*
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
        */
    }
    catch (error) {
        logger.error(`Job ${jobId} failed:`, error);
        await db.collection("itemizadoImportJobs").doc(jobId).update({
            status: "error",
            errorMessage: error.message || "Ocurrió un error desconocido.",
            finishedAt: new Date(),
        });
    }
});
//# sourceMappingURL=processItemizadoJob.js.map