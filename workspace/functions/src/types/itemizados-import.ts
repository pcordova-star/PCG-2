// functions/src/types/itemizados-import.ts
import { z } from 'zod';

const ItemizadoRowSchema = z.object({
    id: z.string(),
    parentId: z.string().nullable(),
    type: z.enum(['chapter', 'subchapter', 'item']),
    description: z.string(),
    unit: z.string().optional().nullable(),
    quantity: z.number().optional().nullable(),
    unit_price: z.number().optional().nullable(),
    total: z.number().optional().nullable(),
    chapterIndex: z.number(),
});

export const ItemizadoImportOutputSchema = z.object({
    currency: z.string(),
    source: z.string(),
    chapters: z.array(z.string()),
    rows: z.array(ItemizadoRowSchema)
});

export type ItemizadoImportOutput = z.infer<typeof ItemizadoImportOutputSchema>;
