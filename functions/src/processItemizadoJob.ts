// functions/src/processItemizadoJob.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { FieldValue } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { z } from "zod";
import { GEMINI_API_KEY_SECRET } from "./params";
import { ai } from "./genkit-config";

// Inicializar Firebase Admin SDK si no se ha hecho
if (getApps().length === 0) {
  initializeApp();
}

type ProcessItemizadoJobPayload = {
  pdfDataUri: string;
  obraId: string;
  obraNombre: string;
  notas?: string;
};

export const processItemizadoJob = onDocumentCreated(
  {
    // 🔴 MUY IMPORTANTE: mantener esta región para no duplicar/borrar la función existente
    region: "us-central1",

    document: "itemizadoImportJobs/{jobId}",

    secrets: [GEMINI_API_KEY_SECRET],

    cpu: 1,
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  async (event) => {
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
      logger.info(
        `[${jobId}] Job ignored. Current status: ${jobData.status}`
      );
      return;
    }

    // 2. Marcar como procesando
    try {
      await jobRef.update({
        status: "processing",
        startedAt: FieldValue.serverTimestamp(),
      });
      logger.info(`[${jobId}] Status updated to processing.`);
    } catch (err) {
      logger.error(
        `[${jobId}] Failed to update status to processing.`,
        err
      );
      return;
    }

    try {
      // 3. Genkit ya inicializado vía import (usa secret inyectado)
      logger.info(`[${jobId}] Using Genkit AI instance.`);

      const ImportarItemizadoInputSchema = z.object({
        pdfDataUri: z.string(),
        obraId: z.string(),
        obraNombre: z.string(),
        notas: z.string().optional(),
      });

      const importarItemizadoPrompt = ai.definePrompt({
        name: "importarItemizadoPrompt",
        model: "googleai/gemini-2.5-flash",
        input: { schema: ImportarItemizadoInputSchema as any },
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

      const importarItemizadoFlow = ai.defineFlow(
        {
          name: "importarItemizadoCloudFunctionFlow",
          inputSchema: ImportarItemizadoInputSchema as any,
        },
        async (input: any) => {
          logger.info(`[${jobId}] Genkit flow started.`);
          const res = await (importarItemizadoPrompt as any)(input);
          const output = res?.output ?? res;

          if (!output) {
            throw new Error("AI returned empty output.");
          }

          logger.info(`[${jobId}] Genkit flow completed.`);
          return output;
        }
      );

      const parsedInput =
        ImportarItemizadoInputSchema.parse(
          jobData
        ) as ProcessItemizadoJobPayload;

      let analisisResult;
      try {
        analisisResult = await (importarItemizadoFlow as any)({
          pdfDataUri: parsedInput.pdfDataUri,
          obraId: parsedInput.obraId,
          obraNombre: parsedInput.obraNombre,
          notas: parsedInput.notas ?? "Analizar itemizado completo.",
        });
      } catch (flowErr: any) {
        logger.error(`[${jobId}] Genkit flow failed.`, flowErr);
        await jobRef.update({
          status: "error",
          errorMessage: `FLOW_FAILED: ${flowErr.message}`,
          processedAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      // 4. Guardar resultado
      await jobRef.update({
        status: "done",
        result: analisisResult,
        processedAt: FieldValue.serverTimestamp(),
      });

      logger.info(`[${jobId}] Job completed successfully.`);
    } catch (err: any) {
      logger.error(`[${jobId}] Catastrophic error.`, err);
      try {
        await jobRef.update({
          status: "error",
          errorMessage:
            err?.message ??
            "Unexpected error during itemizado processing.",
          processedAt: FieldValue.serverTimestamp(),
        });
      } catch (finalErr) {
        logger.error(
          `[${jobId}] Failed to write final error state.`,
          finalErr
        );
      }
    }
  }
);
