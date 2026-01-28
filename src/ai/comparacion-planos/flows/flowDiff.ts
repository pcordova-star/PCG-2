// src/ai/comparacion-planos/flows/flowDiff.ts
"use server";

import { ai } from '@/genkit';
import { z } from 'zod';
import { DiffTecnicoOutputSchema } from '@/types/comparacion-planos';

const diffPromptText = `Eres un experto en interpretación de planos de construcción.
Tu tarea es comparar dos imágenes: Plano A (versión original) y Plano B (versión modificada).
Debes identificar todas las diferencias visuales, geométricas, textuales y de anotaciones entre ambos.

Plano A (Original): {{media url=planoA_DataUri}}
Plano B (Modificado): {{media url=planoB_DataUri}}

Instrucciones:
1.  Analiza detalladamente ambas imágenes.
2.  Para cada diferencia encontrada, crea un objeto "DiffElemento".
3.  Clasifica cada diferencia en "tipo" como 'agregado', 'eliminado' o 'modificado'.
4.  Describe el cambio de forma clara y concisa en el campo "descripcion".
5.  Si es aplicable, indica la ubicación aproximada del cambio en el campo "ubicacion".
6.  Genera un "resumen" conciso de los cambios más importantes.
7.  Tu respuesta DEBE SER EXCLUSIVAMENTE un objeto JSON válido que siga la siguiente estructura, sin texto adicional, explicaciones ni formato markdown fuera del JSON.`;


const DiffInputSchema = z.object({
    planoA_DataUri: z.string(),
    planoB_DataUri: z.string(),
});

type DiffInput = z.infer<typeof DiffInputSchema>;

const diffPrompt = ai.definePrompt(
  {
    name: 'diffTecnicoPrompt',
    model: 'googleai/gemini-2.0-flash',
    input: { schema: DiffInputSchema },
    output: { schema: DiffTecnicoOutputSchema },
    prompt: diffPromptText,
  },
);

export const runDiffFlow = ai.defineFlow(
  {
    name: 'runDiffTecnicoFlow',
    inputSchema: DiffInputSchema,
    outputSchema: DiffTecnicoOutputSchema,
  },
  async (input: DiffInput) => {
    const { output } = await diffPrompt(input);
    if (!output) {
      throw new Error("La IA no generó una respuesta válida para el diff técnico.");
    }
    return output;
  }
);
