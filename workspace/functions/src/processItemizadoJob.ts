// workspace/functions/src/processItemizadoJob.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { getAdminApp } from "./firebaseAdmin";
import fetch from "node-fetch";

const adminApp = getAdminApp();
const db = adminApp.firestore();

export const processItemizadoJob = functions
  .region("us-central1")
  .runWith({ 
    timeoutSeconds: 540, 
    memory: "1GB",
    secrets: ["GOOGLE_GENAI_API_KEY"] 
  })
  .firestore.document("itemizadoImportJobs/{jobId}")
  .onCreate(async (snapshot, context) => {
    const { jobId } = context.params;
    const jobData = snapshot.data();
    const jobRef = snapshot.ref;

    logger.info(`[${jobId}] Job triggered`);    

    if (jobData.status !== "queued") {
      logger.warn(`[${jobId}] Not queued. Ignoring.`);
      return;
    }

    await jobRef.update({
      status: "processing",
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    
    if (!apiKey) {
      logger.error(`[${jobId}] GOOGLE_GENAI_API_KEY no está configurada en el entorno de la función.`);
      await jobRef.update({
        status: "error",
        errorMessage: "La clave de API de Google no está configurada en el servidor.",
      });
      return;
    }

    try {
      const { pdfDataUri, notas, sourceFileName } = jobData;

      if (!pdfDataUri) throw new Error("pdfDataUri vacío.");

      const match = pdfDataUri.match(/^data:(application\/pdf);base64,(.*)$/);
      if (!match) throw new Error("Formato inválido: data:application/pdf;base64,...");

      const mimeType = match[1];
      const base64Data = match[2];

      const prompt = `
PROMPT GEMINI – IMPORTADOR DE PRESUPUESTOS (PCG)
Eres un analista de costos y presupuestos de construcción en Chile, con experiencia en licitaciones privadas y públicas.

Vas a analizar el texto completo extraído desde un PDF de presupuesto de obra.

OBJETIVO
Transformar el contenido en un ITEMIZADO TÉCNICO ESTRUCTURADO, listo para ser usado en un sistema de control de gestión de obras.

REGLAS GENERALES
- El proyecto es un edificio en Chile.
- Asume moneda CLP.
- NO inventes partidas ni valores que no estén explícitos o claramente inferibles.
- Si una cantidad o precio no aparece, déjalo como null.
- Respeta la jerarquía técnica real de obra.
- El resultado debe ser exclusivamente JSON válido.
- No incluyas explicaciones ni texto adicional.

ESTRUCTURA JERÁRQUICA OBLIGATORIA
Nivel 1 → Especialidad
Nivel 2 → Partida
Nivel 3 → Subpartida (si existe)

Especialidades válidas:
- Obras Preliminares
- Obras de Fundación
- Estructura
- Arquitectura
- Instalaciones Sanitarias
- Instalaciones Eléctricas
- Corrientes Débiles
- Climatización (si existe)
- Obras Exteriores

FORMATO DE SALIDA (JSON)

{
  "currency": "CLP",
  "source": "pdf_import",
  "especialidades": [
    {
      "code": "01",
      "name": "Obras Preliminares",
      "items": [
        {
          "code": "01.01",
          "name": "Instalación de faena",
          "unit": "global",
          "quantity": 1,
          "unit_price": 25000000,
          "total": 25000000
        }
      ]
    }
  ]
}

CAMPOS OBLIGATORIOS POR ÍTEM
- code: string jerárquico correlativo
- name: string
- unit: m2 | m3 | kg | ml | punto | unidad | global | hh
- quantity: number | null
- unit_price: number | null
- total: number | null

REGLAS DE INTERPRETACIÓN
- Si el PDF tiene totales por sección, distribúyelos solo si la lógica es evidente; si no, déjalos a nivel de partida.
- No mezclar especialidades.
- No agrupar partidas distintas en un solo ítem.
- Si detectas subtítulos, trátalos como partidas padre.
- Mantén el orden original del documento.
- No calcules IVA ni gastos generales si no están explícitos.

CONTEXTO DE ENTRADA
A continuación recibirás el texto completo extraído del PDF, página por página.
`;

      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
        },
      };

      const response = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const err = await response.json();
        const errorAny = err as any; 
        throw new Error(errorAny.response?.data?.error?.message || errorAny.message || "Error desconocido en API Gemini");
      }

      const result = await response.json();
      const rawJson = (result as any).candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawJson) throw new Error("Gemini no retornó texto JSON.");

      const parsed = JSON.parse(rawJson);

      await jobRef.update({
        status: "done",
        result: parsed,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`[${jobId}] Job completado OK`);
    } catch (err: any) {
      logger.error(`[${jobId}] Error`, err);

      const errorAny = err as any;
      const mensajeError = errorAny.response?.data?.error?.message || errorAny.message || "Error desconocido";

      await jobRef.update({
        status: "error",
        errorMessage: `Fallo en Gemini: ${mensajeError}`,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
