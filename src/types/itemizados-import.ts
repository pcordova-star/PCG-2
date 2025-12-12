// src/types/itemizados-import.ts

import { z } from 'zod';

// Definiendo el tipo TS base para poder usarlo en la definición recursiva del esquema Zod.
// Esta es una práctica común para esquemas recursivos con TypeScript.
type ItemNode = {
  code: string | null;
  name: string;
  unit: string | null;
  qty: number | null;
  unitPrice: number | null;
  total: number | null;
  children?: ItemNode[];
};

// Esquema Zod para un nodo de ítem.
// Se usa z.lazy() para manejar la definición recursiva del campo 'children'.
export const ItemNodeSchema: z.ZodType<ItemNode> = z.lazy(() => z.object({
  code: z.string().nullable(),
  name: z.string().min(1, "El nombre del ítem es requerido."),
  unit: z.string().nullable(),
  qty: z.number().nullable(),
  unitPrice: z.number().nullable(),
  total: z.number().nullable(),
  children: z.array(ItemNodeSchema).optional(),
}));

// Tipo de TypeScript inferido desde el esquema Zod de ItemNode.
export type ItemNode = z.infer<typeof ItemNodeSchema>;

// Esquema Zod para un capítulo del presupuesto.
export const ChapterSchema = z.object({
  code: z.string().nullable(),
  name: z.string().min(1, "El nombre del capítulo es requerido."),
  items: z.array(ItemNodeSchema),
});

// Tipo de TypeScript para un capítulo.
export type Chapter = z.infer<typeof ChapterSchema>;

// Esquema Zod para la metadata del archivo importado.
export const ItemizadoImportMetaSchema = z.object({
  sourceFileName: z.string().nullable().optional(),
  currency: z.enum(["CLP", "UF", "USD"]).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Tipo de TypeScript para la metadata.
export type ItemizadoImportMeta = z.infer<typeof ItemizadoImportMetaSchema>;

// Esquema Zod para la salida completa del análisis del itemizado.
export const ItemizadoImportOutputSchema = z.object({
  meta: ItemizadoImportMetaSchema,
  chapters: z.array(ChapterSchema),
});

// Tipo de TypeScript para la salida completa.
export type ItemizadoImportOutput = z.infer<typeof ItemizadoImportOutputSchema>;
