'use server';

import { z } from "zod";
import { ai } from "@/genkit";
import textToSpeech from "@google-cloud/text-to-speech";
import { getStorage } from "firebase-admin/storage";
import { v4 as uuidv4 } from "uuid";

// Cliente TTS
const ttsClient = new textToSpeech.TextToSpeechClient();

export const generateContextualInductionWithAudio = ai.defineFlow(
  {
    name: "generateContextualInductionWithAudio",
    inputSchema: z.object({
      obraId: z.string(),
      obraNombre: z.string(),
      tipoObra: z.string(),
      tipoPersona: z.enum(["trabajador", "subcontratista", "visita"]),
      descripcionTarea: z.string(),
      duracionIngreso: z.enum([
        "visita breve",
        "jornada parcial",
        "jornada completa",
      ]),
    }),
    outputSchema: z.object({
      inductionText: z.string(),
      audioPath: z.string(),
    }),
  },
  async (input) => {
    // 1️⃣ Generar texto con Gemini
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-1.5-pro',
      temperature: 0.2,
      maxTokens: 700,
      system: `
Actúa como un Prevencionista de Riesgos chileno senior, con experiencia práctica en obras de construcción, faenas industriales y control de acceso a obra.

Tu rol es generar una MICRO-INDUCCIÓN DE SEGURIDAD CONTEXTUAL, breve, clara y enfocada en los riesgos reales de la tarea inmediata que una persona va a realizar en una obra específica.

Este contenido es un REFUERZO PREVENTIVO INFORMATIVO.
No reemplaza la inducción formal (ODI), no certifica cumplimiento legal y no toma decisiones.

==============================
CONTEXTO DE ENTRADA (INPUT)
==============================
Recibirás información estructurada como:

- Tipo de obra
- Nombre o identificador de la obra
- Tipo de persona que ingresa:
  - trabajador
  - subcontratista
  - visita
- Descripción breve de la tarea o motivo de ingreso
- Duración estimada del ingreso:
  - visita breve
  - jornada parcial
  - jornada completa

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
- Listo para mostrarse en pantalla o convertirse en audio/video.
`,
      prompt: `
Contexto del ingreso:
- Tipo de obra: ${input.tipoObra}
- Obra: ${input.obraNombre}
- Tipo de persona: ${input.tipoPersona}
- Tarea o motivo: ${input.descripcionTarea}
- Duración del ingreso: ${input.duracionIngreso}
`,
    });

    const inductionText = llmResponse.text.trim();

    // 2️⃣ Convertir texto a audio (TTS voz femenina)
    const ttsRequest = {
      input: { text: inductionText },
      voice: {
        languageCode: "es-CL",
        ssmlGender: "FEMALE" as const,
      },
      audioConfig: {
        audioEncoding: "MP3" as const,
        speakingRate: 0.95,
      },
    };

    const [ttsResponse] = await ttsClient.synthesizeSpeech(ttsRequest);

    if (!ttsResponse.audioContent) {
      throw new Error("No se pudo generar el audio TTS");
    }

    // 3️⃣ Guardar audio en Firebase Storage
    const bucket = getStorage().bucket();
    const audioId = uuidv4();
    const audioPath = `inducciones/${input.obraId}/${audioId}.mp3`;

    const file = bucket.file(audioPath);
    await file.save(ttsResponse.audioContent, {
      contentType: "audio/mpeg",
    });

    return {
      inductionText,
      audioPath,
    };
  }
);
