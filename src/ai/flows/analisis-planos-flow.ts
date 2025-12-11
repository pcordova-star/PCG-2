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
  instalacionesHidraulicas: z.boolean().describe("Analizar instalaciones hidráulicas (agua potable / alcantarillado)."),
  instalacionesElectricas: z.boolean().describe("Analizar instalaciones eléctricas (potencia / iluminación)."),
});
export type OpcionesAnalisis = z.infer<typeof OpcionesAnalisisSchema>;

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
    type: z.string().describe("El tipo de elemento analizado (ej: Losa, Muro, Recinto, Revestimiento, Instalación Hidráulica)."),
    name: z.string().describe("Nombre o descripción del elemento (ej: Losa nivel 1, Muros perimetrales, Baño depto tipo A, Punto de luz tipo A)."),
    unit: z.string().describe("Unidad de medida de la cantidad estimada (ej: m², m³, m, unidad)."),
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

// Carga del prompt desde el archivo /prompts/analizarPlano.prompt
const analizarPlanoPrompt = ai.definePrompt(
  {
    name: 'analizarPlanoPrompt',
    input: { schema: AnalisisPlanoInputSchema },
    output: { schema: AnalisisPlanoOutputSchema },
    prompt: `Eres un asistente experto en análisis de planos de construcción para constructoras. Tu tarea es interpretar un plano arquitectónico o de especialidades y extraer cubicaciones según las opciones solicitadas por el usuario.

Debes seguir estas reglas estrictamente:

1. Analiza el plano proporcionado por el usuario.
2. Considera las opciones seleccionadas por el usuario para enfocar tu análisis.
3. Utiliza las notas adicionales del usuario para refinar tus estimaciones (ej: escala, altura de muros).
4. Tu respuesta DEBE SER EXCLUSIVAMENTE un objeto JSON válido, sin texto adicional ni backticks. El JSON debe cumplir con el esquema de salida especificado.

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
- Opciones de análisis: {{{jsonStringify opciones}}}
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
    const { output } = await analizarPlanoPrompt(input);
    
    if (!output) {
      throw new Error("La IA no devolvió una respuesta válida.");
    }

    return output;
  }
);


// Función exportada que el frontend llamará.
export async function analizarPlano(input: AnalisisPlanoInput): Promise<AnalisisPlanoOutput> {
  return await analisisPlanoFlow(input);
}
