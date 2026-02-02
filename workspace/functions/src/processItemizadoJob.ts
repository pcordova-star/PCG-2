// workspace/functions/src/processItemizadoJob.ts

import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { getAdminApp } from "./firebaseAdmin";
import fetch from 'node-fetch';

const db = getAdminApp().firestore();

// 1. PROMPT MODIFICADO: Ahora pide un JSON por línea. Es más robusto contra truncamientos.
const streamPrompt = `
Eres un experto en analizar presupuestos de construcción. Tu tarea es interpretar un presupuesto en PDF y extraer CADA partida como un objeto JSON independiente en una nueva línea.

REGLAS ESTRICTAS:
1. Analiza el documento PDF adjunto.
2. Por CADA LÍNEA del itemizado (capítulos, partidas, etc.), genera un ÚNICO objeto JSON en una nueva línea.
3. NO envuelvas los objetos en un array JSON ([...]).
4. NO pongas comas entre los objetos JSON de cada línea.
5. Cada línea DEBE ser un JSON válido e independiente.
6. La estructura de cada objeto JSON debe ser:
   {
     "id": "ID jerárquico único (ej: '1', '1.1', '1.2.3')",
     "parentId": "ID del padre o null si es raíz",
     "type": "'chapter', 'subchapter', o 'item'",
     "descripcion": "Descripción completa de la partida",
     "unidad": "Unidad de medida (ej: m2, ml) o null",
     "cantidad": "Cantidad numérica o null",
     "precioUnitario": "Precio unitario numérico o null",
     "especialidad": "Nombre del capítulo principal al que pertenece"
   }
7. Si un valor no existe, usa 'null'. No inventes datos.`;


/**
 * Llama a la API de Gemini y devuelve la respuesta de texto crudo.
 */
async function callGeminiAPI(apiKey: string, model: string, prompt: string, fileBuffer: Buffer): Promise<string> {
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const base64Data = fileBuffer.toString('base64');
    
    const response = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'application/pdf', data: base64Data } }] }],
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        logger.error(`Gemini API error (${model}):`, errText);
        throw new Error(`Error en API Gemini: ${response.statusText}`);
    }

    const result = await response.json() as any;
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error(`La respuesta de Gemini (${model}) no contiene texto.`);
    
    return rawText;
}


export const processPresupuestoPdf = onObjectFinalized(
  { memory: "2GiB", timeoutSeconds: 540, secrets: ["GOOGLE_GENAI_API_KEY"] },
  async (event) => {
    
    const { bucket, name: filePath } = event.data;

    if (!filePath || !filePath.startsWith('itemizados/') || !filePath.endsWith('.pdf')) {
      logger.log(`[IGNORE] File ${filePath} is not a presupuesto PDF.`);
      return;
    }
    
    const jobId = filePath.split("/").pop()!.replace(".pdf", "");
    const jobRef = db.collection('itemizadoImportJobs').doc(jobId);

    try {
        const jobSnap = await jobRef.get();
        if (!jobSnap.exists) {
            throw new Error(`Job document ${jobId} not found.`);
        }
        const jobData = jobSnap.data()!;
        
        if (jobData.status !== "uploaded") {
            logger.warn(`[${jobId}] Job not in 'uploaded' state. Current: ${jobData.status}. Aborting.`);
            return;
        }

        const apiKey = process.env.GOOGLE_GENAI_API_KEY;
        if (!apiKey) {
            throw new Error("GOOGLE_GENAI_API_KEY no está configurada.");
        }
        
        await jobRef.update({ status: "processing", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        const storageBucket = admin.storage().bucket(bucket);
        const file = storageBucket.file(filePath);
        const [pdfBuffer] = await file.download();
        
        await jobRef.update({ status: 'running_ai', statusDetail: 'Analizando documento con IA...', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        
        // 1. Obtener la respuesta de la IA como un bloque de texto.
        const rawResultText = await callGeminiAPI(apiKey, 'gemini-2.0-flash', streamPrompt, pdfBuffer);

        await jobRef.update({ status: 'normalizing_result', statusDetail: 'Procesando resultados...', updatedAt: admin.firestore.FieldValue.serverTimestamp() });

        // 2. Procesar el texto línea por línea.
        const lines = rawResultText.split('\n').filter(line => line.trim().startsWith('{'));
        const finalItems: any[] = [];
        let errors = 0;

        for (const line of lines) {
            try {
                // Intenta parsear cada línea como un JSON independiente.
                const item = JSON.parse(line);
                finalItems.push(item);
            } catch (e) {
                errors++;
                logger.warn(`[${jobId}] Error al parsear línea JSON, se omite: ${line}`, e);
            }
        }
        
        if (finalItems.length === 0 && errors > 0) {
            throw new Error(`El análisis de la IA falló. No se pudo parsear ninguna línea de la respuesta.`);
        }
        if (errors > 0) {
             logger.warn(`[${jobId}] Se encontraron ${errors} líneas con formato JSON inválido que fueron omitidas.`);
        }

        // 3. Guardar el resultado agregado.
        await jobRef.update({
            status: "completed",
            result: { items: finalItems, parsingErrors: errors },
            finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info(`[${jobId}] Job completado. Items extraídos: ${finalItems.length}, Errores de parseo: ${errors}`);

    } catch (err: any) {
        logger.error(`[${jobId}] Error fatal en processItemizadoJob:`, err);
        await jobRef.update({
            status: 'error',
            errorMessage: err.message || "Error desconocido durante el procesamiento.",
            finishedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
  }
);
