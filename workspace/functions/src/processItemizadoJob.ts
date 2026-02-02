// workspace/functions/src/processItemizadoJob.ts

import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { getAdminApp } from "./firebaseAdmin";
import fetch from "node-fetch";

const db = getAdminApp().firestore();

function cleanJsonString(rawString: string): string {
    let cleaned = rawString.replace(/```json/g, "").replace(/```/g, "");
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');

    const startIndex = cleaned.indexOf("{");
    const endIndex = cleaned.lastIndexOf("}");

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error("Respuesta de IA no contenía un objeto JSON válido `{...}`.");
    }
    
    cleaned = cleaned.substring(startIndex, endIndex + 1);
    cleaned = cleaned.replace(/,\s*]/g, "]");
    cleaned = cleaned.replace(/,\s*}/g, "}");
    
    return cleaned;
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
        
        const { notas, obraNombre } = jobData;
        
        const apiKey = process.env.GOOGLE_GENAI_API_KEY;
        if (!apiKey) {
            throw new Error("GOOGLE_GENAI_API_KEY no está configurada en el entorno de la función.");
        }

        const prompt = `Eres un asistente experto en análisis de presupuestos de construcción. Tu tarea es interpretar un presupuesto (en formato PDF) y extraer los capítulos y todas las partidas/subpartidas en una estructura plana.

Debes seguir estas reglas estrictamente:

1.  Analiza el documento PDF que se te entrega.
2.  Procesa CADA LÍNEA del itemizado (capítulos, partidas, sub-partidas) y conviértela en un objeto para el array 'items'.
3.  Para cada fila en 'items', genera un 'id' estable y único (ej: "1", "1.1", "1.2.3").
4.  Para representar la jerarquía, asigna el 'id' del elemento padre al campo 'parentId'. Si un ítem es de primer nivel (un capítulo principal), su 'parentId' debe ser 'null'.
5.  Asigna el tipo de fila correcto en el campo 'type': 'chapter' para títulos principales, 'subchapter' para subtítulos, y 'item' para partidas con cantidades y precios.
6.  Extrae códigos, descripciones, unidades, cantidades y precios unitarios para cada partida.
7.  NO inventes cantidades, precios ni unidades si no están explícitamente en el documento. Si un valor no existe para un ítem (ej. en un capítulo), déjalo como 'null'.
8.  **DIRECTIVA CRÍTICA: Es más importante que el JSON final sea válido y completo a que proceses el 100% del PDF. Si el documento es muy largo y te acercas a tu límite de tokens, es PREFERIBLE que omitas las últimas partidas y te asegures de cerrar correctamente todos los arrays y objetos.**
9.  Tu respuesta DEBE SER EXCLUSIVAMENTE un objeto JSON válido con la estructura \`{ "items": [...] }\`.

Aquí está la información proporcionada por el usuario:
- Obra: ${obraNombre}
- Itemizado PDF: (adjunto)
- Notas adicionales: ${notas || "Sin notas."}

Genera ahora el JSON de salida.`;
        
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

        if (!parsed.items || !Array.isArray(parsed.items)) {
            throw new Error("La respuesta de la IA no contiene un array 'items' válido.");
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
