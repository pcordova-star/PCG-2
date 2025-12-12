
'use server';
/**
 * @fileOverview Flujo de Genkit para extraer un itemizado jerarquizado desde un PDF.
 *
 * - importarItemizado: Función principal que recibe el PDF y devuelve una estructura JSON con el itemizado.
 * - ImportarItemizadoInput: Tipo de entrada para la función.
 * - ItemizadoImportOutput: Tipo de salida (definido en src/types/itemizados-import.ts).
 */

import { ai } from '@/ai/genkit';
import { ItemizadoImportOutput, ItemizadoImportOutputSchema } from '@/types/itemizados-import';
import { z } from 'zod';

// Esquema de entrada para el flujo
const ImportarItemizadoInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "Un itemizado de construcción (en formato PDF), como un data URI que debe incluir el MIME type 'application/pdf' y usar Base64. Formato: 'data:application/pdf;base64,<encoded_data>'."
    ),
  obraId: z.string().describe("ID de la obra a la que pertenece el itemizado."),
  obraNombre: z.string().describe("Nombre de la obra a la que pertenece el itemizado."),
  notas: z.string().optional().describe("Notas adicionales del usuario para guiar el análisis."),
});

// Definición del tipo de entrada inferido desde el esquema Zod.
export type ImportarItemizadoInput = z.infer<typeof ImportarItemizadoInputSchema>;

// Definición del prompt de Genkit.
const importarItemizadoPrompt = ai.definePrompt(
  {
    name: 'importarItemizadoPrompt',
    model: 'googleai/gemini-2.5-pro',
    input: { schema: ImportarItemizadoInputSchema },
    output: { schema: ItemizadoImportOutputSchema },
    prompt: `Eres un asistente experto en análisis de presupuestos de construcción para constructoras. Tu tarea es interpretar un presupuesto (en formato PDF) y extraer los capítulos, sub-capítulos, partidas, unidades, cantidades, precios y totales de forma jerarquizada.

Debes seguir estas reglas estrictamente:

1.  Analiza el documento PDF que se te entrega.
2.  Identifica la estructura jerárquica. Los ítems pueden estar anidados dentro de otros (sub-partidas). Usa el campo 'children' para representar esta anidación.
3.  Extrae códigos, descripciones, unidades, cantidades, precios unitarios y totales para cada partida.
4.  NO inventes cantidades, precios ni unidades si no están explícitamente en el documento. Si un valor no existe para un ítem, déjalo como 'null'.
5.  Tu respuesta DEBE SER EXCLUSIVAMENTE un objeto JSON válido, sin texto adicional, explicaciones ni 'markdown backticks' (\`\`\`json). El JSON debe cumplir con el esquema de salida especificado.

Aquí está la información proporcionada por el usuario:
- Itemizado PDF: {{media url=pdfDataUri}}
- Notas adicionales: {{{notas}}}

Genera ahora el JSON de salida.`
  },
);

// Definición del flujo de Genkit.
const importarItemizadoFlow = ai.defineFlow(
  {
    name: 'importarItemizadoFlow',
    inputSchema: ImportarItemizadoInputSchema,
    outputSchema: ItemizadoImportOutputSchema,
  },
  async (input) => {
    console.log("Iniciando análisis de itemizado PDF para la obra:", input.obraNombre);

    try {
      const { output } = await importarItemizadoPrompt(input);
      
      if (!output) {
        throw new Error("La IA no devolvió una respuesta válida para el itemizado.");
      }

      console.log("Análisis de itemizado completado con éxito.");
      return output;

    } catch (error: any) {
        console.error("[importarItemizadoFlow] Error en Genkit:", error);
        throw new Error("GENKIT_ERROR: " + (error.message || "Error desconocido en el análisis del PDF."));
    }
  }
);

/**
 * Función exportada que el frontend llamará para iniciar el proceso de importación del itemizado.
 * @param input Los datos de entrada, incluyendo el PDF como data URI.
 * @returns Una promesa que resuelve al objeto `ItemizadoImportOutput`.
 */
export async function importarItemizado(input: ImportarItemizadoInput): Promise<ItemizadoImportOutput> {
  return await importarItemizadoFlow(input);
}
