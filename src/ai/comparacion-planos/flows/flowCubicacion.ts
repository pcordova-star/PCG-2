// src/ai/comparacion-planos/flows/flowCubicacion.ts
"use server";

import { ai } from '@/genkit';
import { z } from 'zod';
import { CubicacionDiferencialOutputSchema } from '@/types/comparacion-planos';

// El mismo input que el diff flow.
const CubicacionInputSchema = z.object({
    planoA_DataUri: z.string(),
    planoB_DataUri: z.string(),
});
type CubicacionInput = z.infer<typeof CubicacionInputSchema>;


const cubicacionPromptText = `Eres un experto en cubicación y presupuestos de construcción.
Tu tarea es analizar dos versiones de un plano, Plano A (original) y Plano B (modificado), para detectar variaciones en las cantidades de obra.

Plano A (Original): {{media url=planoA_DataUri}}
Plano B (Modificado): {{media url=planoB_DataUri}}

Instrucciones:
1.  Compara las dos imágenes y detecta cambios que afecten las cantidades de obra (superficies, volúmenes, longitudes, unidades).
2.  Para cada "partida" afectada, genera un objeto "CubicacionPartida".
3.  Define la "unidad" correspondiente (m2, m3, ml, u, kg, etc.).
4.  Indica la cantidad en el Plano A ("cantidadA") y en el Plano B ("cantidadB"). Si una cantidad no existe o no es aplicable (ej. en un elemento nuevo), déjala como null.
5.  Calcula la "diferencia" (cantidadB - cantidadA).
6.  Agrega "observaciones" si es necesario para aclarar un cálculo o suposición.
7.  Genera un "resumen" de las variaciones más significativas.
8.  IMPORTANTE: Tu respuesta DEBE SER EXCLUSIVAMENTE un objeto JSON válido, sin texto adicional, explicaciones, ni \`\`\`json markdown. La respuesta completa debe ser el objeto JSON, comenzando con { y terminando con }.`;


const cubicacionPrompt = ai.definePrompt(
  {
    name: 'cubicacionDiferencialPrompt',
    model: 'googleai/gemini-2.0-flash',
    input: { schema: CubicacionInputSchema },
    output: { schema: CubicacionDiferencialOutputSchema },
    prompt: cubicacionPromptText,
    config: {
      temperature: 0.1,
    }
  },
);

export const runCubicacionFlow = ai.defineFlow(
  {
    name: 'runCubicacionFlow',
    inputSchema: CubicacionInputSchema,
    outputSchema: CubicacionDiferencialOutputSchema,
  },
  async (input: CubicacionInput) => {
    const { output } = await cubicacionPrompt(input);
    if (!output) {
      throw new Error("La IA no generó una respuesta válida para el análisis de cubicación.");
    }
    return output;
  }
);
