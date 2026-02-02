"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemizadoImportOutputSchema = void 0;
// functions/src/types/itemizados-import.ts
const zod_1 = require("zod");
const ItemizadoRowSchema = zod_1.z.object({
    id: zod_1.z.string(),
    parentId: zod_1.z.string().nullable(),
    type: zod_1.z.enum(['chapter', 'subchapter', 'item']),
    description: zod_1.z.string(),
    unit: zod_1.z.string().optional().nullable(),
    quantity: zod_1.z.number().optional().nullable(),
    unit_price: zod_1.z.number().optional().nullable(),
    total: zod_1.z.number().optional().nullable(),
    chapterIndex: zod_1.z.number(),
});
exports.ItemizadoImportOutputSchema = zod_1.z.object({
    currency: zod_1.z.string(),
    source: zod_1.z.string(),
    chapters: zod_1.z.array(zod_1.z.string()),
    rows: zod_1.z.array(ItemizadoRowSchema)
});
//# sourceMappingURL=itemizados-import.js.map