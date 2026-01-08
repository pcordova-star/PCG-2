"use strict";
// functions/src/types/itemizados-import.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemizadoImportOutputSchema = exports.ItemizadoImportMetaSchema = exports.ChapterSchema = exports.ItemRowSchema = void 0;
const zod_1 = require("zod");
// Esquema para una fila individual en la lista plana de ítems.
// La jerarquía se representa con parentId.
exports.ItemRowSchema = zod_1.z.object({
    id: zod_1.z.string().describe("Un identificador único y estable para la fila, ej: '1', '1.1', '1.1.1'."),
    parentId: zod_1.z.string().nullable().describe("El 'id' del ítem padre. Es 'null' si es un ítem de primer nivel dentro de un capítulo."),
    chapterIndex: zod_1.z.number().int().describe("El índice (empezando en 0) del capítulo al que pertenece esta fila, del array 'chapters'."),
    code: zod_1.z.string().nullable(),
    name: zod_1.z.string().min(1, "El nombre del ítem es requerido."),
    unit: zod_1.z.string().nullable(),
    qty: zod_1.z.number().nullable(),
    unitPrice: zod_1.z.number().nullable(),
    total: zod_1.z.number().nullable()
});
// Esquema para la definición de un capítulo.
exports.ChapterSchema = zod_1.z.object({
    code: zod_1.z.string().nullable(),
    name: zod_1.z.string().min(1, "El nombre del capítulo es requerido."),
});
// Esquema para la metadata del archivo importado.
exports.ItemizadoImportMetaSchema = zod_1.z.object({
    sourceFileName: zod_1.z.string().nullable().optional(),
    currency: zod_1.z.enum(["CLP", "UF", "USD"]).nullable().optional(),
    confidence: zod_1.z.number().min(0).max(1).nullable().optional(),
    notes: zod_1.z.string().nullable().optional(),
});
// Esquema de salida principal, ahora con una estructura plana.
exports.ItemizadoImportOutputSchema = zod_1.z.object({
    meta: exports.ItemizadoImportMetaSchema,
    chapters: zod_1.z.array(exports.ChapterSchema).describe("Un array con los nombres y códigos de los capítulos principales."),
    rows: zod_1.z.array(exports.ItemRowSchema).describe("Una lista plana de todas las partidas y subpartidas. La jerarquía se reconstruye usando 'id' y 'parentId'."),
});
