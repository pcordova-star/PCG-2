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

const importarItemizadoPrompt: any = ai.definePrompt(
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

    