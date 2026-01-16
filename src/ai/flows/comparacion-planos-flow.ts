"use server";
/**
 * @fileOverview Flujo de Genkit para comparar dos versiones de un plano.
 *
 * - compararPlanosFlow: Función principal que recibe dos imágenes de planos y devuelve un análisis comparativo estructurado.
 */

import { ai } from '@/server/genkit';
import { ComparacionPlanosInputSchema, ComparacionPlanosOutputSchema } from '@/types/comparacion-planos';
import type { ComparacionPlanosInput, ComparacionPlanosOutput } from '@/types/comparacion-planos';

// Definición del prompt de Genkit.
const comparacionPrompt = ai.definePrompt(
  {
    name: 'comparacionPlanosPrompt',
    model: 'googleai/gemini-1.5-pro-latest',
    input: { schema: ComparacionPlanosInputSchema },
    output: { schema: ComparacionPlanosOutputSchema },
    prompt: `Eres un arquitecto experto en revisión de planos y control de cambios en proyectos de construcción.
Tu tarea es comparar dos imágenes: el Plano A (versión original) y el Plano B (versión modificada).

Plano A (Original):
{{media url=planoA_DataUri}}

Plano B (Modificado):
{{media url=planoB_DataUri}}

Debes generar un análisis detallado y estructurado en tres partes, respondiendo exclusivamente en formato JSON:

1.  **Diff Técnico (diffTecnico):** Crea un resumen en formato Markdown que identifique claramente las diferencias geométricas, de texto, de cotas y de especificaciones. Utiliza listas para enumerar los elementos agregados, modificados y eliminados.

2.  **Cubicación Diferencial (cubicacionDiferencial):** Analiza el impacto de los cambios en las cantidades de obra. Genera una tabla en formato Markdown con las columnas: "Ítem", "Unidad", "Cantidad Anterior", "Cantidad Nueva", "Diferencia". Enfócate en las variaciones más significativas de m², m³, ml y unidades. Si no hay cambios, indícalo.

3.  **Árbol de Impactos por Especialidad (arbolImpactos):** Genera un árbol de dependencias en formato Markdown que muestre cómo un cambio en una especialidad afecta a las otras. Usa una estructura anidada. Ejemplo:
    - **Arquitectura:**
        - Modificación de tabique en Baño 1.
            - **Impacto en Cálculo:** Requiere revisar carga sobre la losa.
            - **Impacto en Sanitario:** Requiere reubicar punto de agua y desagüe.
            - **Impacto en Eléctrico:** Requiere mover enchufe y punto de luz.

Analiza con precisión y presenta los resultados de forma clara y organizada en el JSON solicitado.
`,
  },
);


// Definición del flujo de Genkit.
export const compararPlanosFlow = ai.defineFlow(
  {
    name: 'compararPlanosFlow',
    inputSchema: ComparacionPlanosInputSchema,
    outputSchema: ComparacionPlanosOutputSchema,
  },
  async (input: ComparacionPlanosInput): Promise<ComparacionPlanosOutput> => {
    console.log("Iniciando flujo de comparación de planos...");

    try {
      const { output } = await comparacionPrompt(input);
      
      if (!output) {
        throw new Error("La IA no devolvió una respuesta válida para la comparación.");
      }

      console.log("Comparación de planos completada con éxito.");
      return output;

    } catch (error: any) {
        console.error("[compararPlanosFlow] Error en Genkit:", error);
        throw new Error("GENKIT_ERROR: " + (error.message || "Error desconocido en el análisis comparativo."));
    }
  }
);
