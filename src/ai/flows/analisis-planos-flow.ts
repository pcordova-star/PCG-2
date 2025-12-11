'use server';
/**
 * @fileOverview Flujo de Genkit para analizar planos de construcción con IA.
 *
 * - analizarPlano: Función principal que recibe los datos del plano y las opciones, y devuelve un análisis estructurado.
 * - AnalisisPlanoInput: Tipo de entrada para la función.
 * - AnalisisPlanoOutput: Tipo de salida (JSON estructurado) para lafunción.
 */

import { ai } from '@/ai/genkit';
import {
    AnalisisPlanoInputSchema,
    AnalisisPlanoOutputSchema,
} from '@/types/analisis-planos';
import type { AnalisisPlanoInput, AnalisisPlanoOutput } from '@/types/analisis-planos';
import { z } from 'zod';

const AnalisisPlanoInputWithOpcionesStringSchema = AnalisisPlanoInputSchema.extend({
  opcionesString: z.string(),
});

// Carga del prompt
const analizarPlanoPrompt = ai.definePrompt(
  {
    name: 'analizarPlanoPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: AnalisisPlanoInputWithOpcionesStringSchema },
    output: { schema: AnalisisPlanoOutputSchema },
    prompt: `Eres un asistente experto en análisis de planos de construcción para constructoras. Tu tarea es interpretar un plano (en formato imagen) y extraer cubicaciones según las opciones solicitadas por el usuario.

Debes seguir estas reglas estrictamente:

1.  Analiza la imagen (plano) que se entrega.
2.  Considera las opciones seleccionadas por el usuario para enfocar tu análisis.
3.  Utiliza las notas adicionales del usuario para refinar tus estimaciones (ej: escala, altura de muros).
4.  Tu respuesta DEBE SER EXCLUSIVAMENTE un objeto JSON válido, sin texto adicional ni backticks. El JSON debe cumplir con el esquema de salida especificado.

Detalles del esquema de salida:
- "summary": Un resumen general y conciso de lo que pudiste analizar en el plano.
- "elements": Un arreglo de objetos, donde cada objeto representa un elemento cubicado.
  - "type": Tipo de elemento (ej: "Recinto", "Muro", "Losa", "Instalación Hidráulica").
  - "name": Nombre específico del elemento (ej: "Dormitorio Principal", "Muro Perimetral Norte", "Losa Nivel 2").
  - "unit": Unidad de medida (ej: "m²", "ml", "un").
  - "estimatedQuantity": La cantidad numérica estimada.
  - "confidence": Tu nivel de confianza en la estimación (de 0 a 1).
  - "notes": Supuestos clave que usaste (ej: "Altura de muro estimada en 2.4m", "No se descuentan vanos de puertas/ventanas").

Aquí está la información proporcionada por el usuario:
- Plano: {{media url=photoDataUri}}
- Opciones de análisis: {{{opcionesString}}}
- Notas del usuario: {{{notas}}}
- Obra: {{{obraNombre}}} (ID: {{{obraId}}})

Genera ahora el JSON de salida.`
  },
);


// Definición del flujo de Genkit.
const analisisPlanoFlow = ai.defineFlow(
  {
    name: 'analisisPlanoFlow',
    inputSchema: AnalisisPlanoInputSchema,
    outputSchema: AnalisisPlanoOutputSchema,
  },
  async (input) => {
    console.log("Analizando plano...");
    console.log("Obra ID:", input.obraId);
    console.log("Obra Nombre:", input.obraNombre);
    console.log("Opciones:", input.opciones);
    console.log("Tamaño Data URI:", input.photoDataUri.length);

    try {
      const { output } = await analizarPlanoPrompt({
        ...input,
        opcionesString: JSON.stringify(input.opciones),
      });
      
      if (!output) {
        throw new Error("La IA no devolvió una respuesta válida.");
      }

      return output;
    } catch (error: any) {
        console.error("[analisisPlanoFlow] Error en Genkit:", error);
        throw new Error("GENKIT_ERROR: " + (error.message || "Error desconocido en el análisis de plano"));
    }
  }
);


// Función exportada que el frontend llamará.
export async function analizarPlano(input: AnalisisPlanoInput): Promise<AnalisisPlanoOutput> {
  return await analisisPlanoFlow(input);
}
