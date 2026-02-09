'use server';
/**
 * @fileOverview Flujo de Genkit para generar una micro-inducción de seguridad contextual.
 *
 * - generarInduccionContextual: Función principal que recibe el contexto y devuelve el texto de la inducción.
 * - InduccionContextualInput: Tipo de entrada para la función.
 * - InduccionContextualOutput: Tipo de salida (string).
 */

import { ai } from '@/genkit';
import { z } from 'zod';

// Esquema de entrada para el flujo, basado en el contexto proporcionado.
export const InduccionContextualInputSchema = z.object({
  tipoObra: z.string().describe("Ej: 'Edificación en altura', 'Obra civil', 'Montaje industrial'."),
  nombreObra: z.string().describe("Nombre o identificador de la obra."),
  tipoPersona: z.enum(['trabajador', 'subcontratista', 'visita']).describe("El tipo de persona que ingresa."),
  descripcionTarea: z.string().min(5).describe("Descripción breve de la tarea o motivo de ingreso (ej: 'Instalación de moldajes en losa de piso 3')."),
  duracionIngreso: z.enum(['visita breve', 'jornada parcial', 'jornada completa']).describe("Duración estimada de la permanencia en obra."),
});
export type InduccionContextualInput = z.infer<typeof InduccionContextualInputSchema>;

// La salida ahora es un objeto que contiene el texto de la inducción.
export const InduccionContextualOutputSchema = z.object({
  inductionText: z.string(),
});
export type InduccionContextualOutput = z.infer<typeof InduccionContextualOutputSchema>;

// Definición del prompt de Genkit
const induccionPrompt = ai.definePrompt(
  {
    name: 'induccionSeguridadContextualPrompt',
    model: 'googleai/gemini-2.0-flash', 
    input: { schema: InduccionContextualInputSchema },
    // El prompt sigue esperando un string, el flow se encarga de envolverlo.
    output: { schema: z.string() }, 
    prompt: `Actúa como un Prevencionista de Riesgos chileno senior, con experiencia práctica en obras de construcción, faenas industriales y control de acceso a obra.

Tu rol es generar una MICRO-INDUCCIÓN DE SEGURIDAD CONTEXTUAL, breve, clara y enfocada en los riesgos reales de la tarea inmediata que una persona va a realizar en una obra específica.

Este contenido es un REFUERZO PREVENTIVO INFORMATIVO.
No reemplaza la inducción formal (ODI), no certifica cumplimiento legal y no toma decisiones.

==============================
CONTEXTO DE ENTRADA (INPUT)
==============================
- Tipo de obra: {{tipoObra}}
- Nombre o identificador de la obra: {{nombreObra}}
- Tipo de persona que ingresa: {{tipoPersona}}
- Descripción breve de la tarea o motivo de ingreso: {{descripcionTarea}}
- Duración estimada del ingreso: {{duracionIngreso}}

==============================
OBJETIVO DE LA RESPUESTA
==============================
- Informar SOLO los 2 o 3 riesgos MÁS CRÍTICOS asociados a la tarea descrita.
- Reforzar conductas seguras y medidas de control básicas.
- Generar conciencia del riesgo en el momento del ingreso.
- Usar lenguaje simple, directo y entendible desde un celular.

==============================
REGLAS ESTRICTAS (NO NEGOCIABLES)
==============================
1. NO inventes normativa.
2. NO afirmes que el trabajo es seguro.
3. NO indiques que se cumple la ley.
4. NO autorices ni prohíbas accesos.
5. NO entregues procedimientos técnicos detallados.
6. NO interpretes sanciones ni responsabilidades legales.
7. NO uses lenguaje alarmista ni excesivamente legal.
8. NO excedas la extensión solicitada.

==============================
ESTRUCTURA OBLIGATORIA DE LA MICRO-INDUCCIÓN
==============================

1. INTRODUCCIÓN (máx. 2 frases)
   - Indica que es una inducción preventiva obligatoria para el ingreso.
   - Tono claro y respetuoso.

2. RIESGOS PRINCIPALES DE LA TAREA
   - Enumera SOLO 2 o 3 riesgos relevantes.
   - Usa viñetas.
   - Ejemplos: caídas de altura, golpes, atrapamientos, tránsito de equipos.

3. MEDIDAS PREVENTIVAS CLAVE
   - Qué debe hacer la persona.
   - Uso de EPP cuando corresponda.
   - Instrucciones claras y accionables, sin tecnicismos.

4. CONDUCTAS NO PERMITIDAS
   - Acciones básicas que deben evitarse.
   - Especial cuidado en trabajos en altura si aplica.

5. CIERRE
   - Refuerzo de responsabilidad personal.
   - Indicar que ante dudas debe consultar con supervisión.

==============================
CRITERIOS DE REDACCIÓN
==============================
- Español chileno neutro.
- Frases cortas.
- Tono profesional y preventivo.
- Pensado para lectura o audio en celular.
- Duración total estimada: 1 a 2 minutos.

==============================
DISCLAIMER OBLIGATORIO (SIEMPRE AL FINAL)
==============================
"Esta inducción es informativa y no reemplaza la supervisión directa ni el criterio del prevencionista de riesgos."

==============================
FORMATO DE SALIDA
==============================
- Texto continuo.
- Sin emojis.
- Sin títulos en mayúsculas exageradas.
- Listo para mostrarse en pantalla o convertirse en audio/video.`,
    config: {
        temperature: 0.2,
        maxOutputTokens: 2048,
    }
  },
);

// Definición del flujo de Genkit.
const induccionContextualFlow = ai.defineFlow(
  {
    name: 'induccionContextualFlow',
    inputSchema: InduccionContextualInputSchema,
    outputSchema: InduccionContextualOutputSchema,
  },
  async (input) => {
    const { output } = await induccionPrompt(input);
    
    if (!output) {
      throw new Error("La IA no generó una respuesta válida para la inducción.");
    }

    return { inductionText: output };
  }
);

/**
 * Función exportada que el backend llamará para generar la micro-inducción.
 * @param input Los datos de contexto para generar la inducción.
 * @returns Una promesa que resuelve al texto de la inducción.
 */
export async function generarInduccionContextual(input: InduccionContextualInput): Promise<InduccionContextualOutput> {
  return await induccionContextualFlow(input);
}
