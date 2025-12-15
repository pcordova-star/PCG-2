// functions/src/types/itemizados-import.ts
// Este archivo contiene los esquemas Zod necesarios para la Cloud Function,
// desacoplándola del código del frontend.

import { z } from 'zod';

// Esquema para una fila individual en la lista plana de ítems.
export const ItemRowSchema = z.object({
  id: z.string().describe("Un identificador único y estable para la fila, ej: '1', '1.1', '1.1.1'."),
  parentId: z.string().nullable().describe("El 'id' del ítem padre. Es 'null' si es un ítem de primer nivel dentro de un capítulo."),
  chapterIndex: z.number().int().describe("El índice (empezando en 0) del capítulo al que pertenece esta fila, del array 'chapters'."),
  code: z.string().nullable(),
  name: z.string().min(1, "El nombre del ítem es requerido."),
  unit: z.string().nullable(),
  qty: z.number().nullable(),
  unitPrice: z.number().nullable(),
  total: z.number().nullable()
});

// Esquema para la definición de un capítulo.
export const ChapterSchema = z.object({
  code: z.string().nullable(),
  name: z.string().min(1, "El nombre del capítulo es requerido."),
});

// Esquema para la metadata del archivo importado.
export const ItemizadoImportMetaSchema = z.object({
  sourceFileName: z.string().nullable().optional(),
  currency: z.enum(["CLP", "UF", "USD"]).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Esquema de salida principal.
export const ItemizadoImportOutputSchema = z.object({
  meta: ItemizadoImportMetaSchema,
  chapters: z.array(ChapterSchema).describe("Un array con los nombres y códigos de los capítulos principales."),
  rows: z.array(ItemRowSchema).describe("Una lista plana de todas las partidas y subpartidas. La jerarquía se reconstruye usando 'id' y 'parentId'."),
});

export type ItemizadoImportOutput = z.infer<typeof ItemizadoImportOutputSchema>;
