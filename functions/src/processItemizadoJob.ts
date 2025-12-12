// functions/src/processItemizadoJob.ts
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { ai } from "./genkit-config";
import { ItemizadoImportOutputSchema } from "./types/itemizados-import"; // Asumimos que los tipos se mueven aquí
import { z } from 'zod';

const ImportarItemizadoInputSchema = z.object({
  pdfDataUri: z.string(),
  obraId: z.string(),
  obraNombre: z.string(),
  notas: z.string().optional(),
});

// TEMP: Disabled to avoid TS deep type instantiation during build
const importarItemizadoPrompt = null as any;


export const processItemizadoJob = onDocumentCreated("itemizadoImportJobs/{jobId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.log("No data associated with the event");
    return;
  }
  const jobData = snapshot.data();
  const jobId = event.params.jobId;
  const db = getFirestore();

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

    // Throw a controlled error because the prompt is temporarily disabled.
    throw new Error("processItemizadoJob temporalmente deshabilitado para deploy (TS deep types en Genkit).");
    
    // The following code is unreachable for now:
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

  } catch (error: any) {
    logger.error(`Job ${jobId} failed:`, error);
    // Marcar como 'error'
    await db.collection("itemizadoImportJobs").doc(jobId).update({
      status: "error",
      errorMessage: error.message || "Ocurrió un error desconocido.",
      finishedAt: new Date(),
    });
  }
});
