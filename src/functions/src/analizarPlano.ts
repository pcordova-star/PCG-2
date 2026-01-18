// src/functions/src/analizarPlano.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getInitializedGenkitAi } from "./genkit-config"; 
import { z } from "zod";
import { PPCG_GEMINI_API_KEY_SECRET } from "./params";

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

// --- Cloud Function v2 onCall ---
export const analizarPlano = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 300,
    memory: '1GiB',
    secrets: [PPCG_GEMINI_API_KEY_SECRET],
    cors: [
      "https://pcgoperacion.com",
      /https:\/\/.*\.firebase-studio\.app$/,
      /https:\/\/.*\.cloudworkstations\.dev$/,
      "http://localhost:3000",
    ],
  },
  async (request): Promise<{ result: AnalisisPlanoOutput }> => {
    
    // Autenticación básica
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }

    // Validación de entrada con Zod
    const validationResult = AnalisisPlanoInputSchema.safeParse(request.data);
    if (!validationResult.success) {
      logger.error("Invalid input for analizarPlano", validationResult.error.flatten());
      throw new HttpsError("invalid-argument", "Los datos proporcionados son inválidos.");
    }
    const input: AnalisisPlanoInput = validationResult.data;

    try {
      // Se inicializa genkit dentro para asegurar que process.env.GEMINI_API_KEY esté disponible
      const ai = getInitializedGenkitAi();
      logger.info(`[analizarPlano - ${request.auth.uid}] Iniciando análisis para obra: ${input.obraNombre}`);

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

      logger.info(`[analizarPlano - ${request.auth.uid}] Análisis completado con éxito.`);
      return { result: output };

    } catch (error: any) {
      logger.error(`[analizarPlano - ${request.auth.uid}] Error en Genkit o en la lógica de la función:`, error);
      throw new HttpsError("internal", "Ocurrió un error al procesar el análisis con IA.", error.message);
    }
  }
);
