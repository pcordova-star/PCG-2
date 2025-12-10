'use server';
/**
 * @fileOverview Flujo de Genkit para analizar planos de construcción con IA.
 *
 * - analizarPlano: Función principal que recibe los datos del plano y las opciones, y devuelve un análisis estructurado.
 * - AnalisisPlanoInput: Tipo de entrada para la función.
 * - AnalisisPlanoOutput: Tipo de salida (JSON estructurado) para la función.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Esquema para las opciones de análisis que el usuario puede seleccionar.
const OpcionesAnalisisSchema = z.object({
  superficieUtil: z.boolean().describe("Calcular la superficie útil por cada recinto identificado."),
  m2Muros: z.boolean().describe("Estimar los metros cuadrados totales de muros."),
  m2Losas: z.boolean().describe("Estimar los metros cuadrados totales de losas."),
  m2Revestimientos: z.boolean().describe("Estimar los metros cuadrados de revestimientos en zonas húmedas como baños y cocinas."),
});

// Esquema de entrada para el flujo de Genkit.
const AnalisisPlanoInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "Un plano de construcción (PDF o imagen), como un data URI que debe incluir un MIME type y usar Base64. Formato: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  opciones: OpcionesAnalisisSchema.describe("Opciones seleccionadas por el usuario para el análisis."),
  notas: z.string().optional().describe("Notas adicionales del usuario, como escala, altura de muros, o aclaraciones sobre el plano."),
  obraId: z.string().describe("ID de la obra a la que pertenece el plano."),
  obraNombre: z.string().describe("Nombre de la obra a la que pertenece el plano."),
});
export type AnalisisPlanoInput = z.infer<typeof AnalisisPlanoInputSchema>;

// Esquema para un elemento individual del resultado del análisis.
const ElementoAnalizadoSchema = z.object({
    type: z.enum(["losa", "muro", "recinto", "revestimiento"]).describe("El tipo de elemento analizado."),
    name: z.string().describe("Nombre o descripción del elemento (ej: Losa nivel 1, Muros perimetrales, Baño depto tipo A)."),
    unit: z.enum(["m2", "m3"]).describe("Unidad de medida de la cantidad estimada."),
    estimatedQuantity: z.number().describe("La cantidad numérica estimada para el elemento."),
    confidence: z.number().min(0).max(1).describe("Un valor de 0 a 1 que representa la confianza de la IA en la estimación."),
    notes: z.string().describe("Aclaraciones o supuestos utilizados por la IA para la estimación."),
});

// Esquema de salida (el JSON que la IA debe devolver).
const AnalisisPlanoOutputSchema = z.object({
  summary: z.string().describe("Un resumen general y conciso de lo que se pudo analizar en el plano."),
  elements: z.array(ElementoAnalizadoSchema).describe("Un arreglo de los elementos analizados con sus cantidades estimadas."),
});
export type AnalisisPlanoOutput = z.infer<typeof AnalisisPlanoOutputSchema>;

// Función exportada que el frontend llamará.
export async function analizarPlano(input: AnalisisPlanoInput): Promise<AnalisisPlanoOutput> {
  return await analisisPlanoFlow(input);
}

// Definición del prompt para Genkit.
const prompt = ai.definePrompt({
  name: 'analizarPlanoPrompt',
  input: { schema: AnalisisPlanoInputSchema },
  output: { schema: AnalisisPlanoOutputSchema },
  prompt: `Eres un asistente experto en cubicación y análisis de planos de construcción. Tu rol es analizar el plano proporcionado y estimar cantidades de referencia. Los resultados son una guía y no contractuales.

**Contexto:**
- Obra: {{{obraNombre}}} (ID: {{{obraId}}})
- Notas del usuario: {{{notas}}}

**Tarea:**
Analiza la imagen del plano adjunto y realiza las siguientes cubicaciones según las opciones solicitadas. Responde SIEMPRE en el formato JSON especificado.

**Opciones solicitadas:**
- Superficie útil por recinto: {{{opciones.superficieUtil}}}
- Metros cuadrados de muros: {{{opciones.m2Muros}}}
- Metros cuadrados de losas: {{{opciones.m2Losas}}}
- Metros cuadrados de revestimientos (baños/cocinas): {{{opciones.m2Revestimientos}}}

Para cada elemento que estimes, proporciona un nivel de confianza entre 0 y 1. Si no puedes determinar una cantidad con certeza, usa una confianza baja y explícalo en las notas del elemento.

Plano a analizar:
{{media url=photoDataUri}}`,
});

// Definición del flujo de Genkit.
const analisisPlanoFlow = ai.defineFlow(
  {
    name: 'analisisPlanoFlow',
    inputSchema: AnalisisPlanoInputSchema,
    outputSchema: AnalisisPlanoOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("La IA no devolvió una respuesta válida.");
    }
    return output;
  }
);
