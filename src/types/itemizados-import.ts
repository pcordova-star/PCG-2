// src/types/itemizados-import.ts
import { z } from 'zod';

// Este schema ahora coincide con PresupuestoItem, que es el formato interno de la app.
// La IA debe devolver un array de estos objetos.
export const PresupuestoItemImportSchema = z.object({
    id: z.string().describe("Un ID único para el ítem, como un número jerárquico (ej: '1.2.3')."),
    parentId: z.string().nullable().describe("El ID del ítem padre, o null si es un ítem de nivel raíz."),
    type: z.enum(['chapter', 'subchapter', 'item']).describe("El tipo de ítem."),
    descripcion: z.string().describe("La descripción de la partida."),
    unidad: z.string().optional().nullable().describe("La unidad de medida (m2, ml, kg, etc.)."),
    cantidad: z.number().optional().nullable().describe("La cantidad de la partida."),
    precioUnitario: z.number().optional().nullable().describe("El precio por unidad de la partida."),
    especialidad: z.string().optional().nullable().describe("La especialidad a la que pertenece (ej: 'Obra Gruesa')."),
});

// El output de la IA es un objeto que contiene la lista plana de items.
export const ItemizadoImportOutputSchema = z.object({
  items: z.array(PresupuestoItemImportSchema)
});

export type ItemizadoImportOutput = z.infer<typeof ItemizadoImportOutputSchema>;
