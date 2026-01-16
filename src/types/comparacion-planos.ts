// src/types/comparacion-planos.ts

import { z } from 'zod';

// Esquema de entrada para el flujo de IA.
// Recibe dos imágenes en formato data URI.
export const ComparacionPlanosInputSchema = z.object({
  planoA_DataUri: z.string().describe("Imagen del Plano A (versión original) en formato Data URI."),
  planoB_DataUri: z.string().describe("Imagen del Plano B (versión modificada) en formato Data URI."),
});

export type ComparacionPlanosInput = z.infer<typeof ComparacionPlanosInputSchema>;

// Esquema de salida que la IA debe generar.
// Estructura el análisis en tres partes claras.
export const ComparacionPlanosOutputSchema = z.object({
  diffTecnico: z.string().describe(
    "Un resumen técnico en formato Markdown que lista las diferencias geométricas, textuales y de cotas. Incluir elementos agregados y eliminados."
  ),
  cubicacionDiferencial: z.string().describe(
    "Un resumen en formato Markdown con una tabla de las variaciones de cubicación, mostrando Item, Unidad, Cantidad Anterior, Cantidad Nueva y Diferencia."
  ),
  arbolImpactos: z.string().describe(
    "Un árbol de dependencias en formato Markdown que muestra cómo un cambio en una especialidad (ej: Arquitectura) impacta a otras (ej: Cálculo, Sanitario, Eléctrico)."
  ),
});

export type ComparacionPlanosOutput = z.infer<typeof ComparacionPlanosOutputSchema>;
