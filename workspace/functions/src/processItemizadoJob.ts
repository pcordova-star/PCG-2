// workspace/functions/src/processItemizadoJob.ts

import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { getAdminApp } from "./firebaseAdmin";
import fetch from 'node-fetch';
import { ItemizadoImportOutputSchema } from './types/itemizados-import';
import { z } from 'zod';

const db = getAdminApp().firestore();

const prompt = `Eres un asistente experto en análisis de presupuestos de construcción. Tu tarea es interpretar un presupuesto (en formato PDF) y extraer los capítulos y todas las partidas/subpartidas en una estructura plana.

Debes seguir estas reglas estrictamente:

1.  Analiza el documento PDF que se te entrega.
2.  Primero, identifica los capítulos principales y llena el array 'chapters'.
3.  Luego, procesa CADA LÍNEA del itemizado (capítulos, partidas, sub-partidas) y conviértela en un objeto para el array 'rows'.
4.  Para cada fila en 'rows', genera un 'id' estable y único (ej: "1", "1.1", "1.2.3").
5.  Para representar la jerarquía, asigna el 'id' del elemento padre al campo 'parentId'. Si un ítem es de primer nivel (dentro de un capítulo), su 'parentId' debe ser 'null'.
6.  Asigna el 'chapterIndex' correcto a cada fila, correspondiendo a su capítulo en el array 'chapters'.
7.  Extrae códigos, descripciones, unidades, cantidades, precios unitarios y totales para cada partida.
8.  NO inventes cantidades, precios ni unidades si no están explícitamente en el documento. Si un valor no existe para un ítem, déjalo como 'null'.
9.  Tu respuesta DEBE SER EXCLUSIVAMENTE un objeto JSON válido.

Aquí está la información proporcionada por el usuario:
- Itemizado PDF
- Notas adicionales: sin notas

Genera ahora el JSON de salida.`;

/**
 * Limpia una cadena que se espera contenga JSON, eliminando los delimitadores de markdown
 * y extrayendo solo el objeto JSON principal.
 */
function cleanJsonString(rawString: string): string {
    // 1. Quitar bloques de código Markdown (```json ... ```)
    let cleaned = rawString.replace(/```json\n?|\n?```/g, "");

    // 2. Encontrar el primer '{' y el último '}' para ignorar texto basura al inicio/final
    const startIndex = cleaned.indexOf("{");
    const endIndex = cleaned.lastIndexOf("}");

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error("No se encontró un objeto JSON válido en la respuesta de la IA.");
    }
    
    // 3. Extraer la subcadena que parece ser el JSON
    return cleaned.substring(startIndex, endIndex + 1);
}

export const processPresupuestoPdf = onObjectFinalized(
  { memory: "1GiB", timeoutSeconds: 300, secrets: ["GOOGLE_GENAI_API_KEY"] },
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

        await jobRef.update({ status: "processing", updatedAt: admin.firestore.FieldValue.serverTimestamp() });

        const apiKey = process.env.GOOGLE_GENAI_API_KEY;
        if (!apiKey) {
            throw new Error("GOOGLE_GENAI_API_KEY no está configurada.");
        }
        
        const storageBucket = admin.storage().bucket(bucket);
        const file = storageBucket.file(filePath);
        const [pdfBuffer] = await file.download();

        await jobRef.update({ status: "running_ai", updatedAt: admin.firestore.FieldValue.serverTimestamp() });

        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const base64Data = pdfBuffer.toString('base64');
        
        const response = await fetch(geminiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'application/pdf', data: base64Data } }] }],
                generationConfig: { response_mime_type: "application/json" },
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            logger.error("Gemini API error:", errText);
            throw new Error(`Error en API Gemini: ${response.statusText}`);
        }

        const result = await response.json();
        const rawJson = (result as any).candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!rawJson) {
            throw new Error("La respuesta de Gemini no contiene texto JSON válido.");
        }
        
        const cleanedJson = cleanJsonString(rawJson || '');
        const parsedResult = ItemizadoImportOutputSchema.parse(JSON.parse(cleanedJson));
        
        await jobRef.update({
            status: "completed",
            result: parsedResult,
            finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info(`[${jobId}] Job completado OK.`);

    } catch (err: any) {
        logger.error(`[${jobId}] Error fatal en processPresupuestoPdf:`, err);
        let errorMessage = "Error desconocido durante el procesamiento.";
        if (err instanceof z.ZodError) {
            errorMessage = `Error de validación Zod: ${JSON.stringify(err.flatten())}`;
        } else if (err instanceof Error) {
            errorMessage = err.message;
        }
        
        await jobRef.update({
            status: 'error',
            errorMessage: errorMessage,
            finishedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
  }
);
