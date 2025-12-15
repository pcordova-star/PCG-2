// functions/src/processItemizadoJob.ts
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { FieldValue } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { z } from "zod";

// Inicializar Firebase Admin SDK si no se ha hecho
if (getApps().length === 0) {
  initializeApp();
}

// Tipo plano para evitar errores de instanciación de tipos de Zod
type ProcessItemizadoJobPayload = {
  pdfDataUri: string;
  obraId: string;
  obraNombre: string;
  notas?: string;
};

export const processItemizadoJob = onDocumentCreated(
  {
    document: "itemizadoImportJobs/{jobId}",
    // La región y SA se heredan de setGlobalOptions
    cpu: 1,
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  async (event) => {
    // --- Carga diferida (Lazy Load) de Genkit y sus dependencias ---
    const { ai } = await import("./genkit-config");
    const { ItemizadoImportOutputSchema } = await import('./types/itemizados-import');

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
      const importarItemizadoPrompt = ai.definePrompt(
        {
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
        },
      );

      const importarItemizadoFlow = ai.defineFlow(
        {
          name: 'importarItemizadoCloudFunctionFlow',
          inputSchema: ImportarItemizadoInputSchema,
          outputSchema: ItemizadoImportOutputSchema,
        },
        async (input) => {
          logger.info("[Genkit Flow] Iniciando análisis de itemizado...");
          const { output } = await importarItemizadoPrompt(input);
          if (!output) {
            throw new Error("La IA no devolvió una respuesta válida para el itemizado.");
          }
          logger.info("[Genkit Flow] Análisis completado con éxito.");
          return output;
        }
      );

      // 2. Validar los datos de entrada del documento
      const parsedInput = ImportarItemizadoInputSchema.parse(jobData) as ProcessItemizadoJobPayload;
      
      // 3. Ejecutar el flujo de Genkit para el análisis de IA
      logger.info(`[${jobId}] Llamando al flujo de Genkit para la obra ${parsedInput.obraNombre}...`);
      const analisisResult = await importarItemizadoFlow({
          pdfDataUri: parsedInput.pdfDataUri,
          obraId: parsedInput.obraId,
          obraNombre: parsedInput.obraNombre,
          notas: parsedInput.notas || "Analizar el itemizado completo."
      });

      // 4. Guardar el resultado exitoso en Firestore
      logger.info(`[${jobId}] El análisis de IA fue exitoso. Guardando resultados...`);
      await jobRef.update({
        status: "done",
        result: analisisResult,
        processedAt: FieldValue.serverTimestamp(),
      });
      logger.info(`[${jobId}] Trabajo completado y guardado.`);

    } catch (error: any) {
      logger.error(`[${jobId}] Error catastrófico durante el procesamiento:`, error);
      
      // 5. Guardar el estado de error en Firestore
      await jobRef.update({
        status: "error",
        errorMessage: error.message || "Ocurrió un error desconocido durante el análisis.",
        processedAt: FieldValue.serverTimestamp(),
      });
    }
  }
);
