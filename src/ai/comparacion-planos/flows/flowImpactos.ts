// src/ai/comparacion-planos/flows/flowImpactos.ts
"use server";

import { ai } from '@/genkit';
import { z } from 'zod';
import { ArbolImpactosOutputSchema, DiffTecnicoOutputSchema, CubicacionDiferencialOutputSchema } from '@/types/comparacion-planos';

// Define el schema de entrada para el flujo de impactos, que necesita contexto adicional.
const ImpactoInputSchema = z.object({
    planoA_DataUri: z.string(),
    planoB_DataUri: z.string(),
    diffContext: DiffTecnicoOutputSchema,
    cubicacionContext: CubicacionDiferencialOutputSchema,
});

type ImpactoInput = z.infer<typeof ImpactoInputSchema>;

const impactoPromptText = `Eres un Jefe de Proyectos experto con 20 años de experiencia coordinando especialidades.
Tu tarea es analizar las diferencias entre dos planos para generar un árbol jerárquico de impactos técnicos.

Plano A (Original): {{media url=planoA_DataUri}}
Plano B (Modificado): {{media url=planoB_DataUri}}

Contexto Adicional (Resultados de análisis previos):
---
RESUMEN DE DIFERENCIAS TÉCNICAS:
{{diffContext.resumen}}

RESUMEN DE VARIACIONES DE CUBICACIÓN:
{{cubicacionContext.resumen}}
---

Instrucciones:
1.  Basado en el contexto y las imágenes, identifica los cambios primarios (usualmente en arquitectura).
2.  Para cada cambio, analiza su efecto en cascada sobre otras especialidades en el orden: arquitectura -> estructura -> electricidad -> sanitarias -> climatización.
3.  Crea un nodo "ImpactoNode" para cada especialidad afectada.
4.  Describe el "impactoDirecto" y el "impactoIndirecto" (cómo afecta a otras áreas).
5.  Evalúa la "severidad" como "baja", "media" o "alta".
6.  Identifica el principal "riesgo" (ej: "Sobrecosto", "Atraso", "Incompatibilidad").
7.  Lista "consecuencias" y "recomendaciones".
8.  Si un impacto genera otros, anídalos en "subImpactos".
9.  Tu respuesta DEBE SER EXCLUSIVAMENTE un objeto JSON válido con la estructura de salida, sin texto adicional.`;


// Prompt para el árbol de impactos
const impactosPrompt = ai.definePrompt(
  {
    name: 'arbolImpactosPrompt',
    model: 'googleai/gemini-1.5-flash',
    input: { schema: ImpactoInputSchema },
    output: { schema: ArbolImpactosOutputSchema },
    prompt: impactoPromptText,
  },
);

export const runImpactosFlow = ai.defineFlow(
  {
    name: 'runImpactosFlow',
    inputSchema: ImpactoInputSchema,
    outputSchema: ArbolImpactosOutputSchema,
  },
  async (input: ImpactoInput) => {
    const { output } = await impactosPrompt(input);
    if (!output) {
      throw new Error("La IA no generó una respuesta válida para el árbol de impactos.");
    }
    return output;
  }
);
