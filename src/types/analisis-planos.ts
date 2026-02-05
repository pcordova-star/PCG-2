// src/types/analisis-planos.ts

import { z } from 'zod';

// Esquema para las opciones de análisis que el usuario puede seleccionar.
export const OpcionesAnalisisSchema = z.object({
  enfierraduras: z.boolean().describe("Estimar la cubicación de enfierraduras (kg o ton)."),
  moldajes: z.boolean().describe("Estimar la superficie de moldajes (m²)."),
  hormigon: z.boolean().describe("Estimar el volumen de hormigón (m³)."),
  pavimentos: z.boolean().describe("Estimar la superficie de pavimentos, diferenciando por tipo si es posible."),
  instalacionesSanitarias: z.boolean().describe("Analizar instalaciones sanitarias (agua potable / alcantarillado)."),
  instalacionesElectricas: z.boolean().describe("Analizar instalaciones eléctricas (potencia / iluminación)."),
});
export type OpcionesAnalisis = z.infer<typeof OpcionesAnalisisSchema>;

// Esquema de entrada para el flujo de Genkit.
export const AnalisisPlanoInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "Un plano de construcción (PDF o imagen), como un data URI que debe incluir un MIME type y usar Base64. Formato: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  opciones: OpcionesAnalisisSchema.describe("Opciones seleccionadas por el usuario para el análisis."),
  notas: z.string().optional().describe("Notas adicionales del usuario, como escala, altura de muros, o aclaraciones sobre el plano."),
  obraId: z.string().describe("ID de la obra a la que pertenece el plano."),
  obraNombre: z.string().describe("Nombre de la obra a la que pertenece el plano."),
  companyId: z.string().describe("ID de la compañía a la que pertenece la obra."),
  planType: z.string().describe("Tipo de plano (ej: arquitectura, estructura) usado para el preset de optimización."),
  cache: z.object({
    hash: z.string(),
    cacheKey: z.string(),
    modelId: z.string(),
    promptVersion: z.string(),
    presetVersion: z.string(),
  }).optional(),
  imageMeta: z.object({
    sizeMb: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional(),
});
export type AnalisisPlanoInput = z.infer<typeof AnalisisPlanoInputSchema>;

// Esquema para un elemento individual del resultado del análisis.
const ElementoAnalizadoSchema = z.object({
    type: z.string().describe("El tipo de elemento analizado (ej: Losa, Muro, Recinto, Revestimiento, Instalación Hidráulica)."),
    name: z.string().describe("Nombre o descripción del elemento (ej: Losa nivel 1, Muros perimetrales, Baño depto tipo A, Punto de luz tipo A)."),
    unit: z.string().describe("Unidad de medida de la cantidad estimada (ej: m², m³, ml, 'u')."),
    estimatedQuantity: z.number().describe("La cantidad numérica estimada para el elemento."),
    confidence: z.number().min(0).max(1).describe("Un valor de 0 a 1 que representa la confianza de la IA en la estimación."),
    notes: z.string().describe("Aclaraciones o supuestos utilizados por la IA para la estimación."),
});

// Esquema de salida (el JSON que la IA debe devolver).
export const AnalisisPlanoOutputSchema = z.object({
  summary: z.string().describe("Un resumen general y conciso de lo que se pudo analizar en el plano."),
  elements: z.array(ElementoAnalizadoSchema).describe("Un arreglo de los elementos analizados con sus cantidades estimadas."),
});
export type AnalisisPlanoOutput = z.infer<typeof AnalisisPlanoOutputSchema>;
