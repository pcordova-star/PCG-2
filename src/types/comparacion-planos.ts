// src/types/comparacion-planos.ts

import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';
import { ComparacionPlanosFSM } from '@/lib/comparacion-planos/fsm';

// Export the status type from the FSM definition
export type ComparacionJobStatus = (typeof ComparacionPlanosFSM.validStatuses)[number];

// --- Esquemas para el Análisis de Diferencias (Diff) ---

export const DiffElementoSchema = z.object({
  tipo: z.enum(["agregado", "eliminado", "modificado"]).describe("Tipo de diferencia detectada."),
  descripcion: z.string().describe("Descripción clara y concisa del cambio."),
  ubicacion: z.string().optional().describe("Ubicación aproximada del cambio en el plano."),
});

export type DiffElemento = z.infer<typeof DiffElementoSchema>;

export const DiffTecnicoOutputSchema = z.object({
  elementos: z.array(DiffElementoSchema).describe("Lista de todos los elementos diferentes encontrados."),
  resumen: z.string().describe("Un resumen conciso de los cambios más importantes."),
});

export type DiffTecnicoOutput = z.infer<typeof DiffTecnicoOutputSchema>;

// Esquema de entrada para el flujo de IA.
export const ComparacionPlanosInputSchema = z.object({
  planoA_DataUri: z.string().describe("Imagen del Plano A (versión original) en formato Data URI."),
  planoB_DataUri: z.string().describe("Imagen del Plano B (versión modificada) en formato Data URI."),
});

export type ComparacionPlanosInput = z.infer<typeof ComparacionPlanosInputSchema>;

// --- Esquemas para Cubicación Diferencial ---
export const CubicacionPartidaSchema = z.object({
  partida: z.string().describe("Nombre de la partida o elemento afectado."),
  unidad: z.string().describe("Unidad de medida (m2, m3, ml, u, kg, etc.)."),
  cantidadA: z.number().nullable().describe("Cantidad estimada en el Plano A."),
  cantidadB: z.number().nullable().describe("Cantidad estimada en el Plano B."),
  diferencia: z.number().describe("Diferencia calculada (cantidadB - cantidadA)."),
  observaciones: z.string().optional().describe("Aclaraciones sobre el cálculo o suposición clave."),
});

export const CubicacionDiferencialOutputSchema = z.object({
  partidas: z.array(CubicacionPartidaSchema).describe("Lista de todas las partidas con variaciones de cantidad detectadas."),
  resumen: z.string().describe("Un resumen conciso del impacto general en la cubicación."),
});

export type CubicacionDiferencialOutput = z.infer<typeof CubicacionDiferencialOutputSchema>;


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

export const ArbolImpactosOutputSchema = z.object({
    impactos: z.array(ImpactoNodeSchema),
});
export type ArbolImpactosOutput = z.infer<typeof ArbolImpactosOutputSchema>;


// Esquema de salida que la IA debe generar.
export const ComparacionPlanosOutputSchema = z.object({
  diffTecnico: DiffTecnicoOutputSchema,
  cubicacionDiferencial: CubicacionDiferencialOutputSchema,
  arbolImpactos: ArbolImpactosOutputSchema.describe(
    "Un árbol jerárquico de objetos JSON que muestra cómo un cambio en una especialidad impacta a las otras."
  ),
});

export type ComparacionPlanosOutput = z.infer<typeof ComparacionPlanosOutputSchema>;


// --- Tipos para el Job Asíncrono ---

/**
 * Define la estructura de un error estandarizado para el job.
 */
export interface ComparacionError {
  code: string; // ej: "UPLOAD_INVALID_FILE", "AI_DIFF_FAILED"
  message: string; // descripción breve para el usuario
  details?: any; // stack trace, metadata, contexto
}

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
    errorMessage?: ComparacionError | null;
    results?: Partial<ComparacionPlanosOutput>;
    reportUrl?: string;
    reportStoragePath?: string;
}
