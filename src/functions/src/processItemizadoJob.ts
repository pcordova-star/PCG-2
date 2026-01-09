// src/functions/src/processItemizadoJob.ts
import * as functions from 'firebase-functions';
import * as logger from "firebase-functions/logger";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getInitializedGenkitAi } from "./genkit-config"; 
import * as admin from 'firebase-admin';

type ProcessItemizadoJobPayload = {
  pdfDataUri: string;
  obraId: string;
  obraNombre: string;
  notas?: string;
};

export const processItemizadoJob = functions.runWith({
  timeoutSeconds: 540,
  memory: '1GB',
  secrets: ["GEMINI_API_KEY"]
}).region("us-central1").firestore
  .document("itemizadoImportJobs/{jobId}")
  .onCreate(async (snapshot, context) => {
    const { jobId } = context.params;
    const jobData = snapshot.data();
    const jobRef = snapshot.ref;
    
    logger.info(`[${jobId}] Job triggered.`, {
        path: snapshot.ref.path,
        currentStatus: jobData.status,
    });

    if (jobData.status !== 'queued') {
      logger.info(`[${jobId}] Job is not in 'queued' state (current: ${jobData.status}). Ignoring.`);
      return;
    }
    
    try {
        await jobRef.update({ 
            status: "processing",
            startedAt: FieldValue.serverTimestamp()
        });
        logger.info(`[${jobId}] Job status updated to 'processing'.`);
    } catch (updateError) {
        logger.error(`[${jobId}] FATAL: Could not update job status to 'processing'. Aborting.`, updateError);
        return;
    }

    try {
      const ai = getInitializedGenkitAi();
      logger.info(`[${jobId}] Genkit module initialized successfully.`);
      
      const ImportarItemizadoInputSchema = z.object({
        pdfDataUri: z.string(),
        obraId: z.string(),
        obraNombre: z.string(),
        notas: z.string().optional(),
      });
      
      const importarItemizadoPrompt = ai.definePrompt(
        {
          name: 'importarItemizadoPrompt',
          model: 'googleai/gemini-1.5-flash-latest',
          input: { schema: ImportarItemizadoInputSchema },
          prompt: `Eres un asistente experto en análisis de presupuestos de construcción... (el prompt completo va aquí)`
        }
      );

      const importarItemizadoFlow = ai.defineFlow(
        {
          name: 'importarItemizadoCloudFunctionFlow',
          inputSchema: ImportarItemizadoInputSchema,
        },
        async (input: any) => {
          const res = await importarItemizadoPrompt(input);
          if (!res.output) {
            throw new Error("La IA no devolvió una respuesta válida.");
          }
          return res.output;
        }
      );

      const parsedInput = ImportarItemizadoInputSchema.parse(jobData) as ProcessItemizadoJobPayload;
      
      const analisisResult = await importarItemizadoFlow({
          pdfDataUri: parsedInput.pdfDataUri,
          obraId: parsedInput.obraId,
          obraNombre: parsedInput.obraNombre,
          notas: parsedInput.notas || "Analizar el itemizado completo.",
      });

      logger.info(`[${jobId}] AI analysis successful. Saving results...`);
      await jobRef.update({
        status: "done",
        result: analisisResult,
        processedAt: FieldValue.serverTimestamp(),
      });
      logger.info(`[${jobId}] Job completed and saved.`);

    } catch (error: any) {
      logger.error(`[${jobId}] Catastrophic error during processing:`, error);
      try {
        await jobRef.update({
          status: "error",
          errorMessage: error.message || "Ocurrió un error desconocido durante el análisis.",
          processedAt: FieldValue.serverTimestamp(),
        });
      } catch (finalError) {
          logger.error(`[${jobId}] CRITICAL: Failed to even update a final error state.`, finalError);
      }
    }
});
