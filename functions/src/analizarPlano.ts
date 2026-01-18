// functions/src/analizarPlano.ts
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import { z } from "zod";

// Schemas
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

const ElementoAnalizadoSchema = z.object({
    type: z.string(), name: z.string(), unit: z.string(),
    estimatedQuantity: z.number(), confidence: z.number(), notes: z.string(),
});
const AnalisisPlanoOutputSchema = z.object({
  summary: z.string(),
  elements: z.array(ElementoAnalizadoSchema),
});

export const analizarPlano = functions
  .region("us-central1")
  .runWith({ timeoutSeconds: 300, memory: "1GB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }

    const validationResult = AnalisisPlanoInputSchema.safeParse(data);
    if (!validationResult.success) {
      logger.error("Invalid input for analizarPlano", validationResult.error.flatten());
      throw new functions.https.HttpsError("invalid-argument", "Los datos proporcionados son inválidos.");
    }
    
    const input = validationResult.data;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError("internal", "La clave de API de Gemini no está configurada en el servidor.");
    }

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Eres un asistente experto en análisis de planos. Tu tarea es interpretar la imagen de un plano de construcción y generar una cubicación de referencia en formato JSON. Tu respuesta DEBE SER EXCLUSIVAMENTE un objeto JSON válido, sin texto adicional, explicaciones ni formato markdown.
    
    Información:
    - Opciones de análisis: ${JSON.stringify(input.opciones)}
    - Notas del usuario: ${input.notas || 'Sin notas.'}
    - Obra: ${input.obraNombre}

    Genera el JSON de salida con la siguiente estructura: ${JSON.stringify(AnalisisPlanoOutputSchema)}`;

    const match = input.photoDataUri.match(/^data:(image\/jpeg);base64,(.*)$/);
    if (!match) {
        throw new functions.https.HttpsError("invalid-argument", "El formato de photoDataUri debe ser 'data:image/jpeg;base64,...'.");
    }
    const mimeType = match[1];
    const base64Data = match[2];

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
      },
    };

    try {
      logger.info(`[analizarPlano] Llamando a Gemini API para obra ${input.obraId}`);
      const response = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        logger.error("Error desde la API de Gemini:", errorBody);
        throw new functions.https.HttpsError("internal", `Error de la API de Gemini: ${errorBody.error?.message || response.statusText}`);
      }
      
      const responseData = await response.json();
      const textResponse = responseData.candidates[0].content.parts[0].text;
      const parsedResult = JSON.parse(textResponse);
      
      AnalisisPlanoOutputSchema.parse(parsedResult);

      logger.info(`[analizarPlano] Análisis completado con éxito para obra ${input.obraId}.`);
      return { result: parsedResult };

    } catch (error: any) {
      logger.error(`[analizarPlano] Error en la llamada a la IA:`, error);
      throw new functions.https.HttpsError("internal", "Ocurrió un error al procesar el análisis con IA.", error.message);
    }
  });