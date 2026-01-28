"use server";
/**
 * @fileOverview Flujo de Genkit para comparar dos versiones de un plano.
 *
 * - compararPlanosFlow: Función principal que recibe dos imágenes de planos y devuelve un análisis comparativo estructurado.
 */

import { ai } from '@/genkit';
import { ComparacionPlanosInputSchema, ComparacionPlanosOutputSchema } from '@/types/comparacion-planos';
import type { ComparacionPlanosInput, ComparacionPlanosOutput } from '@/types/comparacion-planos';

// Definición del prompt de Genkit.
const comparacionPrompt = ai.definePrompt(
  {
    name: 'comparacionPlanosPrompt',
    model: 'googleai/gemini-1.5-flash',
    input: { schema: ComparacionPlanosInputSchema },
    output: { schema: ComparacionPlanosOutputSchema },
    prompt: `Eres un arquitecto experto y jefe de proyectos con 20 años de experiencia en revisión de planos y control de cambios en obras de construcción complejas. Tu tarea es realizar un análisis diferencial exhaustivo entre dos planos: el Plano A (versión original) y el Plano B (versión nueva).

Plano A (Original):
{{media url=planoA_DataUri}}

Plano B (Nueva Versión):
{{media url=planoB_DataUri}}

Debes generar un análisis estructurado en formato JSON, sin texto adicional, explicaciones ni formato markdown fuera del JSON solicitado. El JSON debe contener tres claves principales: 'diffTecnico', 'cubicacionDiferencial' y 'arbolImpactos'.

1.  **Clave 'diffTecnico' (string):**
    Crea un resumen en formato Markdown que identifique claramente las diferencias geométricas, textuales, de cotas y de especificaciones. Utiliza listas para enumerar los elementos AGREGADOS, MODIFICADOS y ELIMINADOS. Sé específico y conciso.

2.  **Clave 'cubicacionDiferencial' (string):**
    Analiza el impacto de los cambios en las cantidades de obra. Genera una tabla en formato Markdown con las columnas: "Partida", "Unidad", "Cantidad Anterior", "Cantidad Nueva", "Diferencia". Enfócate en las variaciones más significativas de m², m³, ml y unidades (ej: artefactos sanitarios, puntos de luz). Si no hay cambios, indícalo claramente.

3.  **Clave 'arbolImpactos' (array de objetos JSON):**
    Este es el análisis más importante. Genera un árbol jerárquico que muestre cómo un cambio en una especialidad afecta a las otras. La jerarquía debe seguir el orden: arquitectura -> estructura -> electricidad -> sanitarias -> climatización.

    Cada nodo del árbol debe tener la siguiente estructura JSON:
    - \`especialidad\`: (string) El nombre de la especialidad afectada (ej: "arquitectura", "estructura").
    - \`impactoDirecto\`: (string) Descripción clara del cambio principal en esta especialidad (ej: "Se desplaza tabique del baño principal 30cm hacia el norte").
    - \`impactoIndirecto\`: (string, opcional) Cómo este cambio repercute en otras áreas generales.
    - \`severidad\`: (string enum: "baja", "media", "alta") Nivel de criticidad del impacto.
    - \`riesgo\`: (string, opcional) El principal riesgo asociado (ej: "Sobrecosto por demolición", "Atraso en programa", "Incompatibilidad de especialidades").
    - \`consecuencias\`: (array de strings, opcional) Lista de efectos secundarios directos (ej: "Requiere demoler y reconstruir tabique", "Afecta trazado de ductos de clima").
    - \`recomendaciones\`: (array de strings, opcional) Lista de acciones sugeridas (ej: "Emitir RDI a calculista para validar carga", "Coordinar nueva ubicación de puntos eléctricos con ITO").
    - \`subImpactos\`: (array de nodos, opcional) Un array de nodos hijos que representan los impactos en las especialidades dependientes.

    **Ejemplo de lógica para el árbol:** Si detectas que se movió un muro en 'arquitectura', debes crear un 'subImpacto' para 'estructura' (si afecta una carga), 'electricidad' (si hay enchufes en ese muro) y 'sanitarias' (si hay cañerías).
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
