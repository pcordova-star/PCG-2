// functions/src/processItemizadoJob.ts
import * as functions from 'firebase-functions';
import * as logger from "firebase-functions/logger";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getInitializedGenkitAi } from "./genkit-config"; 

type ProcessItemizadoJobPayload = {
  pdfDataUri: string;
  obraId: string;
  obraNombre: string;
  notas?: string;
  sourceFileName?: string;
};

export const processItemizadoJob = functions
  .region("us-central1") // Región compatible con secretos y Genkit
  .runWith({
    timeoutSeconds: 540,
    memory: '1GB',
    secrets: ["GEMINI_API_KEY"]
  })
  .firestore
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
        sourceFileName: z.string().optional(),
      });
      
      const importarItemizadoPrompt = ai.definePrompt(
        {
          name: 'importarItemizadoPrompt',
          model: 'googleai/gemini-1.5-flash',
          input: { schema: ImportarItemizadoInputSchema as any },
          prompt: `Eres un asistente experto en análisis de presupuestos de construcción. Tu tarea es interpretar un presupuesto (en formato PDF) y extraer los capítulos y todas las partidas/subpartidas en una estructura plana.

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
- Nombre del archivo: {{{sourceFileName}}}
- Itemizado PDF: {{media url=pdfDataUri}}
- Notas adicionales: {{{notas}}}

Genera ahora el JSON de salida.`
        }
      );

      const importarItemizadoFlow = ai.defineFlow(
        {
          name: 'importarItemizadoCloudFunctionFlow',
          inputSchema: ImportarItemizadoInputSchema as any,
        },
        async (input: any) => {
          logger.info("[Genkit Flow] Iniciando análisis de itemizado...");
          const res = await (importarItemizadoPrompt as any)(input);
          const output = res?.output ?? res;
          if (!output) {
            throw new Error("La IA no devolvió una respuesta válida para el itemizado.");
          }
          logger.info("[Genkit Flow] Análisis completado con éxito.");
          return output;
        }
      );

      const parsedInput = ImportarItemizadoInputSchema.parse(jobData) as ProcessItemizadoJobPayload;
      
      let analisisResult;
      try {
          logger.info(`[${jobId}] Calling Genkit flow for obra ${parsedInput.obraNombre}...`);
          analisisResult = await (importarItemizadoFlow as any)({
              pdfDataUri: parsedInput.pdfDataUri,
              obraId: parsedInput.obraId,
              obraNombre: parsedInput.obraNombre,
              notas: parsedInput.notas || "Analizar el itemizado completo.",
              sourceFileName: parsedInput.sourceFileName || 'documento.pdf'
          });
      } catch(flowError: any) {
          logger.error(`[${jobId}] Genkit flow execution failed.`, flowError);
          await jobRef.update({
              status: "error",
              errorMessage: `FLOW_FAILED: ${flowError.message}`,
              processedAt: FieldValue.serverTimestamp(),
          });
          return;
      }

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
