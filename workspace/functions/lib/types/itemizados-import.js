"use strict";
// functions/src/types/itemizados-import.ts
// Este archivo contiene los esquemas Zod necesarios para la Cloud Function,
// desacoplándola del código del frontend.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemizadoImportOutputSchema = void 0;
const zod_1 = require("zod");
const BudgetItemSchema = zod_1.z.lazy(() => zod_1.z.object({
    code: zod_1.z.string(),
    name: zod_1.z.string(),
    unit: zod_1.z.string(),
    quantity: zod_1.z.number().nullable(),
    unit_price: zod_1.z.number().nullable(),
    total: zod_1.z.number().nullable(),
    items: zod_1.z.array(BudgetItemSchema).optional(),
}));
const EspecialidadSchema = zod_1.z.object({
    code: zod_1.z.string(),
    name: zod_1.z.string(),
    items: zod_1.z.array(BudgetItemSchema)
});
exports.ItemizadoImportOutputSchema = zod_1.z.object({
    currency: zod_1.z.string(),
    source: zod_1.z.string(),
    especialidades: zod_1.z.array(EspecialidadSchema)
});
//# sourceMappingURL=itemizados-import.js.map