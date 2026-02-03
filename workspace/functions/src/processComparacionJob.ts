// workspace/functions/src/processComparacionJob.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { getAdminApp } from './firebaseAdmin';
import fetch from 'node-fetch';
import { getPlanoAsDataUri } from './lib/storage';

const adminApp = getAdminApp();
const db = adminApp.firestore();

// --- Prompts para cada agente especializado (reescritos para ser más estrictos) ---

const diffPromptText = `Analyze the two provided images, Plano A (original) and Plano B (modified). Your task is to identify all differences.
Your output MUST be a single, valid JSON object and nothing else. Do not include markdown, comments, or any text outside of the JSON structure.
The JSON object must conform to the following structure:
{
  "elementos": [
    {
      "tipo": "agregado" | "eliminado" | "modificado",
      "descripcion": "string",
      "ubicacion": "string (optional)"
    }
  ],
  "resumen": "string"
}`;

const cubicacionPromptText = `Analyze the two provided images, Plano A (original) and Plano B (modified), to detect variations in construction quantities.
Your output MUST be a single, valid JSON object and nothing else. Do not include markdown, comments, or any text outside of the JSON structure.
The JSON object must conform to the following structure:
{
  "partidas": [
    {
      "partida": "string",
      "unidad": "string",
      "cantidadA": "number | null",
      "cantidadB": "number | null",
      "diferencia": "number",
      "observaciones": "string (optional)"
    }
  ],
  "resumen": "string"
}`;

const impactoPromptText = `Analyze the provided images (Plano A and B) and the context JSON to generate a hierarchical tree of technical impacts.
The context is:
{{CONTEXT_JSON}}

Your output MUST be a single, valid JSON object and nothing else. Do not include markdown, comments, or any text outside of the JSON structure.
The JSON object must conform to the following structure:
{
  "impactos": [
    {
      "especialidad": "string",
      "impactoDirecto": "string",
      "severidad": "baja" | "media" | "alta",
      "riesgo": "string (optional)",
      "consecuencias": ["string"],
      "recomendaciones": ["string"],
      "subImpactos": [ "..." ]
    }
  ]
}`;

/**
 * Limpia una cadena que se espera contenga JSON, eliminando los delimitadores de markdown
 * y extrayendo solo el objeto JSON principal.
 * @param rawString La respuesta de texto crudo de la IA.
 * @returns Una cadena JSON limpia.
 */
function cleanJsonString(rawString: string): string {
    // 1. Quitar bloques de código Markdown (```json ... ```)
    let cleaned = rawString.replace(/```json/g, "").replace(/```/g, "");

    // 2. Encontrar el primer '{' y el último '}' para ignorar texto basura al inicio/final
    const startIndex = cleaned.indexOf("{");
    const endIndex = cleaned.lastIndexOf("}");

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error("No se encontró un objeto JSON válido en la respuesta de la IA.");
    }
    
    // 3. Extraer la subcadena que parece ser el JSON
    return cleaned.substring(startIndex, endIndex + 1);
}

// --- Función para llamar a la API de Gemini (actualizada) ---
async function callGeminiAPI(apiKey: string, parts: any[]) {
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    const response = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0.1, // Reducir creatividad para un JSON más consistente
            },
        }),
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error?.message || "Error desconocido en API Gemini");
    }

    const result = await response.json() as any;
    const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson)
        throw new Error("La respuesta de Gemini no contiene texto JSON válido.");
    
    // Limpiar la respuesta antes de parsear
    const cleanedJson = cleanJsonString(rawJson);
    return JSON.parse(cleanedJson);
}

// --- Cloud Function principal ---
export const processComparacionJob = functions
    .region("us-central1")
    .runWith({ timeoutSeconds: 540, memory: "1GB", secrets: ["GOOGLE_GENAI_API_KEY"] })
    .firestore.document("comparacionPlanosJobs/{jobId}")
    .onUpdate(async (change, context) => {
        const { jobId } = context.params;
        const jobDataAfter = change.after.data();
        const jobDataBefore = change.before.data();

        if (jobDataAfter.status !== 'queued_for_analysis' || jobDataBefore.status === 'queued_for_analysis') {
            return; // No es el trigger que buscamos
        }

        logger.info(`[${jobId}] Iniciando análisis de comparación de planos...`);
        const jobRef = change.after.ref;
        const apiKey = process.env.GOOGLE_GENAI_API_KEY;

        if (!apiKey) {
            logger.error(`[${jobId}] GOOGLE_GENAI_API_KEY no configurada.`);
            await jobRef.update({ status: 'error', errorMessage: { code: "NO_API_KEY", message: "La clave de API del servidor no está configurada." } });
            return;
        }
        
        try {
            const { planoA_storagePath, planoB_storagePath } = jobDataAfter;
            if (!planoA_storagePath || !planoB_storagePath) {
                throw new Error("Rutas de almacenamiento de planos no encontradas en el job.");
            }

            // 1. Descargar planos
            await jobRef.update({ status: 'processing', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            const [planoA, planoB] = await Promise.all([
                getPlanoAsDataUri(planoA_storagePath),
                getPlanoAsDataUri(planoB_storagePath)
            ]);
            
            const planoA_part = { inline_data: { mime_type: planoA.mimeType, data: planoA.data } };
            const planoB_part = { inline_data: { mime_type: planoB.mimeType, data: planoB.data } };

            // 2. Ejecutar análisis de Diff y Cubicación en paralelo
            await jobRef.update({ status: 'analyzing-diff', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            const [diffResult, cubicacionResult] = await Promise.all([
                callGeminiAPI(apiKey, [ {text: diffPromptText}, planoA_part, planoB_part ]),
                callGeminiAPI(apiKey, [ {text: cubicacionPromptText}, planoA_part, planoB_part ])
            ]);
            
            await jobRef.update({ 
                'results.diffTecnico': diffResult,
                'results.cubicacionDiferencial': cubicacionResult,
                 status: 'generating-impactos',
                 updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // 3. Ejecutar análisis de Impactos con el contexto de los anteriores
            const contextForImpact = {
                diff_resumen: diffResult.resumen || 'N/A',
                cubicacion_resumen: cubicacionResult.resumen || 'N/A',
            };
            const impactoPromptFinal = impactoPromptText.replace('{{CONTEXT_JSON}}', JSON.stringify(contextForImpact));
            
            const impactosResult = await callGeminiAPI(apiKey, [ {text: impactoPromptFinal}, planoA_part, planoB_part ]);
            
            // 4. Finalizar
            await jobRef.update({
                'results.arbolImpactos': impactosResult,
                status: 'completed',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            logger.info(`[${jobId}] Análisis de comparación completado exitosamente.`);

        } catch (error: any) {
            logger.error(`[${jobId}] Error durante el análisis:`, error);
            await jobRef.update({
                status: 'error',
                errorMessage: { code: "ANALYSIS_FAILED", message: error.message },
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });
