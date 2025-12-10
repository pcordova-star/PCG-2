'use server';
/**
 * @fileOverview Flujo de Genkit para analizar planos de construcción con IA.
 *
 * - analizarPlano: Función principal que recibe los datos del plano y las opciones, y devuelve un análisis estructurado.
 * - AnalisisPlanoInput: Tipo de entrada para la función.
 * - AnalisisPlanoOutput: Tipo de salida (JSON estructurado) para la función.
 */

import { ai, geminiFlashModel } from '@/ai/genkit';
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
    type: z.enum(["losa", "muro", "recinto", "revestimiento", "instalacion_hidraulica", "instalacion_electrica"]).describe("El tipo de elemento analizado."),
    name: z.string().describe("Nombre o descripción del elemento (ej: Losa nivel 1, Muros perimetrales, Baño depto tipo A, Punto de luz tipo A)."),
    unit: z.enum(["m2", "m3", "m", "unidad"]).describe("Unidad de medida de la cantidad estimada."),
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
  model: geminiFlashModel,
  input: { schema: AnalisisPlanoInputSchema },
  output: { schema: AnalisisPlanoOutputSchema },
  prompt: `Actúas como un INGENIERO CIVIL / ARQUITECTO experto en:
- Lectura de planos de arquitectura, instalaciones hidráulicas y eléctricas.
- Cubicación de obras de edificación en Chile.
- Uso de criterios de medición típicos de oficina de estudios (muros, losas, recintos, instalaciones).

Contexto del proyecto:
- Estás integrado en la plataforma PCG (Plataforma de Control y Gestión de obras).
- Tu rol es entregar REFERENCIAS de cubicación y cantidades estimadas a partir de planos.
- Tus resultados NO son contractuales ni definitivos: son solo apoyo para revisión / cross-check.

Lineamientos obligatorios:
1. Trabaja solo con la información disponible en el/los plano(s) y en el texto que recibes.
2. Si el plano es poco legible o falta información, sé conservador:
   - Indica claramente las limitaciones y supuestos en el campo "notes".
   - Prefiere decir “no puedo estimar esto con suficiente certeza” antes que inventar.
3. Distingue entre:
   - Arquitectura: recintos, muros, losas, revestimientos.
   - Instalaciones hidráulicas: tuberías principales, artefactos sanitarios, puntos de agua.
   - Instalaciones eléctricas: circuitos principales, puntos de luz, enchufes, tableros.
4. Usa criterios típicos:
   - Muros en m² (largo × altura), descontando vanos cuando sea evidente.
   - Losas en m².
   - Elementos de volumen en m³ solo cuando sea razonable (ej. hormigón).
   - Instalaciones principalmente en m (recorridos) o unidades (puntos / artefactos).
5. Si el usuario te da un formato JSON objetivo, RESPETA ESE FORMATO:
   - Responde ÚNICAMENTE en JSON válido.
   - No agregues texto fuera del JSON.
   - Completa los campos de "notes" y "confidence" explicando qué tan seguro estás y por qué.

Tu objetivo principal:
- Entregar un resumen estructurado y claro de lo que PUEDES estimar razonablemente desde el plano.
- Aclarar si hay partes que NO puedes medir o donde tu estimación es muy incierta.
- Ser útil como SEGUNDO PAR DE OJOS para el cubicador humano, nunca reemplazarlo.

**Contexto específico de esta tarea:**
- Obra: {{{obraNombre}}} (ID: {{{obraId}}})
- Notas del usuario: {{{notas}}}

**Tarea:**
Analiza la imagen del plano adjunto y realiza las siguientes cubicaciones según las opciones solicitadas. Responde SIEMPRE en el formato JSON especificado.

**Opciones de Arquitectura/Obra Gruesa:**
- Superficie útil por recinto: {{{opciones.superficieUtil}}}
- Metros cuadrados de muros: {{{opciones.m2Muros}}}
- Metros cuadrados de losas: {{{opciones.m2Losas}}}
- Metros cuadrados de revestimientos (baños/cocinas): {{{opciones.m2Revestimientos}}}

**Opciones de Instalaciones:**
- Instalaciones hidráulicas (agua potable/alcantarillado): {{{opciones.instalacionesHidraulicas}}}
- Instalaciones eléctricas (potencia/iluminación): {{{opciones.instalacionesElectricas}}}

**Instrucciones específicas por tipo de análisis:**
- Si se solicita análisis de **instalaciones hidráulicas**, incluye estimaciones de longitud de tuberías principales, número de artefactos sanitarios y puntos de agua relevantes. La unidad puede ser "m" o "unidad".
- Si se solicita análisis de **instalaciones eléctricas**, incluye estimaciones de cantidad de puntos de luz, enchufes, recorridos principales de circuitos y tableros. La unidad puede ser "m" o "unidad".

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
