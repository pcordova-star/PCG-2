// src/types/itemizados-import.ts
import { z } from 'zod';

const BudgetItemSchema: z.ZodType<any> = z.lazy(() => z.object({
    code: z.string(),
    name: z.string(),
    unit: z.string(),
    quantity: z.number().nullable(),
    unit_price: z.number().nullable(),
    total: z.number().nullable(),
    items: z.array(BudgetItemSchema).optional(),
}));

const EspecialidadSchema = z.object({
    code: z.string(),
    name: z.string(),
    items: z.array(BudgetItemSchema)
});

export const ItemizadoImportOutputSchema = z.object({
    currency: z.string(),
    source: z.string(),
    especialidades: z.array(EspecialidadSchema)
});

export type ItemizadoImportOutput = z.infer<typeof ItemizadoImportOutputSchema>;

// Tipo auxiliar para el frontend, para reconstruir el árbol para visualización.
export type ItemNode = z.infer<typeof BudgetItemSchema> & {
  children: ItemNode[];
};
