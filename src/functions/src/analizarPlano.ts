// src/functions/src/analizarPlano.ts
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import { getInitializedGenkitAi } from "./genkit-config"; 
import { z } from "zod";

// --- Schemas (copiados desde /types/analisis-planos.ts para desacoplar) ---
const OpcionesAnalisisSchema = z.object({
  superficieUtil: z.boolean(), m2Muros: z.boolean(), m2Losas: z.boolean(),
  m2Revestimientos: z.boolean(), instalacionesHidraulicas: z.boolean(), instalacionesElectricas: z.boolean(),
});

const AnalisisPlanoInputSchema = z.object({
  photoDataUri: z.string(),
  opciones: OpcionesAnalisisSchema,
  notas: z.string().optional(),
  obraId: z.string(),
  obraNombre: z.string(),
  companyId: z.string(),
  planType: z.string(),
});
type AnalisisPlanoInput = z.infer<typeof AnalisisPlanoInputSchema>;

const ElementoAnalizadoSchema = z.object({
    type: z.string(), name: z.string(), unit: z.string(),
    estimatedQuantity: z.number(), confidence: z.number(), notes: z.string(),
});

const AnalisisPlanoOutputSchema = z.object({
  summary: z.string(),
  elements: z.array(ElementoAnalizadoSchema),
});
type AnalisisPlanoOutput = z.infer<typeof AnalisisPlanoOutputSchema>;

const AnalisisPlanoInputWithOpcionesStringSchema = AnalisisPlanoInputSchema.extend({
  opcionesString: z.string(),
});

// --- Cloud Function v1 onCall ---
export const analizarPlano = functions
  .region("us-central1")
  .runWith({ 
    timeoutSeconds: 300, 
    memory: '1GiB',
    secrets: ["GEMINI_API_KEY"] 
  })
  .https.onCall(async (data, context) => {
    
    // Autenticación básica
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }

    // Validación de entrada con Zod
    const validationResult = AnalisisPlanoInputSchema.safeParse(data);
    if (!validationResult.success) {
      logger.error("Invalid input for analizarPlano", validationResult.error.flatten());
      throw new functions.https.HttpsError("invalid-argument", "Los datos proporcionados son inválidos.");
    }
    const input: AnalisisPlanoInput = validationResult.data;

    try {
      // Se inicializa genkit dentro para asegurar que process.env.GEMINI_API_KEY esté disponible
      const ai = getInitializedGenkitAi();
      logger.info(`[analizarPlano - ${context.auth.uid}] Iniciando análisis para obra: ${input.obraNombre}`);

      const analizarPlanoPrompt = ai.definePrompt(
        {
          name: 'analizarPlanoPromptFunction',
          model: 'googleai/gemini-1.5-flash',
          input: { schema: AnalisisPlanoInputWithOpcionesStringSchema },
          output: { schema: AnalisisPlanoOutputSchema },
          prompt: `Eres un asistente experto en análisis de planos. Tu respuesta DEBE SER EXCLUSIVAMENTE un objeto JSON válido.
          
          Información:
          - Plano: {{media url=photoDataUri}}
          - Opciones de análisis: {{{opcionesString}}}
          - Notas del usuario: {{{notas}}}
          - Obra: {{{obraNombre}}} (ID: {{{obraId}}})

          Genera el JSON de salida.`
        },
      );
      
      const { output } = await analizarPlanoPrompt({
        ...input,
        opcionesString: JSON.stringify(input.opciones),
      });
      
      if (!output) {
        throw new Error("La IA no devolvió una respuesta válida.");
      }

      logger.info(`[analizarPlano - ${context.auth.uid}] Análisis completado con éxito.`);
      return { result: output };

    } catch (error: any) {
      logger.error(`[analizarPlano - ${context.auth.uid}] Error en Genkit o en la lógica de la función:`, error);
      throw new functions.https.HttpsError("internal", "Ocurrió un error al procesar el análisis con IA.", error.message);
    }
  }
);
