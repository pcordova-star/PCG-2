// src/types/comparacion-planos.ts

import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// Esquema de entrada para el flujo de IA.
export const ComparacionPlanosInputSchema = z.object({
  planoA_DataUri: z.string().describe("Imagen del Plano A (versión original) en formato Data URI."),
  planoB_DataUri: z.string().describe("Imagen del Plano B (versión modificada) en formato Data URI."),
});

export type ComparacionPlanosInput = z.infer<typeof ComparacionPlanosInputSchema>;


// --- Esquema del Árbol de Impactos ---

// Definición recursiva para un nodo del árbol de impacto.
const BaseImpactoNodeSchema = z.object({
  especialidad: z.string().describe("Especialidad afectada (ej: 'arquitectura', 'estructura', 'electricidad')."),
  impactoDirecto: z.string().describe("Descripción del cambio o impacto específico en esta especialidad."),
  impactoIndirecto: z.string().optional().describe("Descripción de cómo este cambio afecta a otras áreas."),
  severidad: z.enum(["baja", "media", "alta"]).describe("Nivel de severidad del impacto (baja, media, alta)."),
  riesgo: z.string().optional().describe("Breve descripción del riesgo principal asociado (ej: 'Sobrecosto', 'Atraso en programa', 'Incompatibilidad')."),
  consecuencias: z.array(z.string()).optional().describe("Lista de efectos o problemas secundarios que podrían surgir."),
  recomendaciones: z.array(z.string()).optional().describe("Lista de acciones sugeridas para mitigar el impacto."),
});

type ImpactoNode = z.infer<typeof BaseImpactoNodeSchema> & {
  subImpactos?: ImpactoNode[];
};

const ImpactoNodeSchema: z.ZodType<ImpactoNode> = BaseImpactoNodeSchema.extend({
  subImpactos: z.lazy(() => z.array(ImpactoNodeSchema)).optional(),
});

// Esquema de salida que la IA debe generar.
export const ComparacionPlanosOutputSchema = z.object({
  diffTecnico: z.string().describe(
    "Un resumen técnico en formato Markdown que lista las diferencias geométricas, textuales y de cotas. Incluir elementos agregados y eliminados."
  ),
  cubicacionDiferencial: z.string().describe(
    "Un resumen en formato Markdown con una tabla de las variaciones de cubicación, mostrando Item, Unidad, Cantidad Anterior, Cantidad Nueva y Diferencia."
  ),
  arbolImpactos: z.array(ImpactoNodeSchema).describe(
    "Un árbol jerárquico de objetos JSON que muestra cómo un cambio en una especialidad impacta a las otras."
  ),
});

export type ComparacionPlanosOutput = z.infer<typeof ComparacionPlanosOutputSchema>;

// --- Tipos para el Job Asíncrono ---

export type ComparacionJobStatus =
  | 'pending'
  | 'uploading'
  | 'uploaded'
  | 'processing'
  | 'analyzing-diff'
  | 'analyzing-cubicacion'
  | 'generating-impactos'
  | 'completed'
  | 'error';

export interface ComparacionPlanosJob {
    id?: string;
    jobId: string;
    empresaId: string;
    userId: string;
    createdAt: Timestamp; 
    updatedAt: Timestamp; 
    status: ComparacionJobStatus;
    planoA_storagePath?: string;
    planoB_storagePath?: string;
    errorMessage?: string;
    results?: ComparacionPlanosOutput;
}
