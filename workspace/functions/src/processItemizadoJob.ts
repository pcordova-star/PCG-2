// workspace/functions/src/processItemizadoJob.ts

import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { getAdminApp } from "./firebaseAdmin";
import fetch from "node-fetch";

const db = getAdminApp().firestore();

function cleanJsonString(rawString: string): string {
    // 1. Quitar bloques de código Markdown (```json ... ```)
    let cleaned = rawString.replace(/```json/g, "").replace(/```/g, "");

    // 2. Eliminar comas sobrantes (trailing commas) antes de corchetes y llaves de cierre
    // Esto es clave para corregir errores de formato comunes de la IA.
    cleaned = cleaned.replace(/,\s*(\]|})/g, "$1");

    // 3. Encontrar el primer '{' y el último '}' para ignorar texto basura al inicio/final
    const startIndex = cleaned.indexOf("{");
    const endIndex = cleaned.lastIndexOf("}");

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error("Respuesta de IA no contenía un objeto JSON válido.");
    }
    
    // 4. Extraer la subcadena que parece ser el JSON
    return cleaned.substring(startIndex, endIndex + 1);
}

export const processPresupuestoPdf = onObjectFinalized(
  { memory: "2GiB", timeoutSeconds: 540, secrets: ["GOOGLE_GENAI_API_KEY"] },
  async (event) => {
    
    const { bucket, name: filePath } = event.data;
    if (!filePath || !filePath.startsWith('itemizados/') || !filePath.endsWith('.pdf')) {
      logger.log(`[IGNORE] File ${filePath} is not a presupuesto PDF.`);
      return;
    }
    
    const pathParts = filePath.split("/");
    const jobId = pathParts[pathParts.length - 1].replace(".pdf", "");

    if (!jobId) {
        logger.error("Could not extract jobId from file path:", filePath);
        return;
    }

    const jobRef = db.collection('itemizadoImportJobs').doc(jobId);

    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) {
        logger.error(`[${jobId}] Job document not found in Firestore.`);
        return;
    }
    const jobData = jobSnap.data()!;

    if (jobData.status !== "uploaded") {
        logger.warn(`[${jobId}] Job not in 'uploaded' state (current: ${jobData.status}). Ignoring trigger.`);
        return;
    }

    try {
        await jobRef.update({ status: "processing", updatedAt: admin.firestore.FieldValue.serverTimestamp() });

        const storageBucket = admin.storage().bucket(bucket);
        const file = storageBucket.file(filePath);
        const [buffer] = await file.download();
        const base64Data = buffer.toString('base64');
        
        const { notas, sourceFileName } = jobData;
        
        const apiKey = process.env.GOOGLE_GENAI_API_KEY;
        if (!apiKey) {
            throw new Error("GOOGLE_GENAI_API_KEY no está configurada en el entorno de la función.");
        }

        const prompt = `PROMPT GEMINI – IMPORTADOR DE PRESUPUESTOS (PCG)
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
Notas adicionales del usuario (úsalas como guía, especialmente para escalas o alturas):
${notas || "Sin notas."}
`;
        
        await jobRef.update({ status: 'running_ai', updatedAt: admin.firestore.FieldValue.serverTimestamp() });

        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const requestBody = {
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'application/pdf', data: base64Data } }] }],
            generationConfig: { response_mime_type: "application/json" },
        };
        
        const response = await fetch(geminiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errText = await response.text();
            logger.error(`[${jobId}] Gemini API error:`, errText);
            throw new Error(`Error en API Gemini: ${response.statusText}`);
        }

        const result = await response.json();
        const rawJson = (result as any).candidates?.[0]?.content?.parts?.[0]?.text;
        
        await jobRef.update({ rawAiResult: rawJson, status: "normalizing_result", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        if (!rawJson) throw new Error("La respuesta de Gemini no contiene texto JSON válido.");
        
        let parsed;
        try {
            parsed = JSON.parse(cleanJsonString(rawJson));
        } catch (e: any) {
            const snippet = rawJson.substring(0, 500);
            throw new Error(`La IA devolvió un JSON inválido. Error de parseo: ${e.message}. Comienzo de la respuesta: "${snippet}..."`);
        }

        if (!parsed.especialidades || !Array.isArray(parsed.especialidades) || parsed.especialidades.length === 0) {
            throw new Error("IA no devolvió un array de 'especialidades' válido.");
        }

        await jobRef.update({
            status: "completed",
            result: parsed,
            finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        logger.info(`[${jobId}] Job completado OK.`);
        
    } catch(err: any) {
        logger.error(`[${jobId}] Error processing job:`, err);
        await jobRef.update({
            status: 'error',
            errorMessage: err.message || "Error desconocido durante el procesamiento.",
            finishedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
  }
);
