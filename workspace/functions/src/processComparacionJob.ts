// workspace/functions/src/processComparacionJob.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { getAdminApp } from './firebaseAdmin';
import fetch from 'node-fetch';
import { getPlanoAsDataUri } from './lib/storage';

const adminApp = getAdminApp();
const db = adminApp.firestore();

// --- Prompt monolítico para una sola llamada a la IA ---
const monolithicPromptText = `You are a construction project analysis expert. Your task is to compare two plan versions, "Plano A" (original) and "Plano B" (modified), and provide a comprehensive analysis report.

Your output MUST BE EXCLUSIVELY a single, valid JSON object without any additional text, comments, or markdown.

The JSON object must conform to the following structure:
{
  "diffTecnico": {
    "elementos": [{"tipo": "agregado" | "eliminado" | "modificado", "descripcion": "string", "ubicacion": "string (optional)"}],
    "resumen": "string"
  },
  "cubicacionDiferencial": {
    "partidas": [{"partida": "string", "unidad": "string", "cantidadA": "number | null", "cantidadB": "number | null", "diferencia": "number", "observaciones": "string (optional)"}],
    "resumen": "string"
  },
  "arbolImpactos": {
    "impactos": [{
      "especialidad": "string",
      "impactoDirecto": "string",
      "severidad": "baja" | "media" | "alta",
      "riesgo": "string (optional)",
      "consecuencias": ["string"],
      "recomendaciones": ["string"],
      "subImpactos": [ "..." ]
    }]
  }
}

INSTRUCTIONS FOR EACH SECTION:
1.  **diffTecnico**: Identify all visual, geometric, and textual differences. Classify each as 'agregado', 'eliminado', or 'modificado'.
2.  **cubicacionDiferencial**: Detect changes affecting quantities (areas, volumes, lengths, units). For each affected item, calculate the difference.
3.  **arbolImpactos**: Based on the differences YOU found by comparing the images, generate a hierarchical tree of technical impacts. Analyze the cascade effect on specialties in the order: arquitectura -> estructura -> electricidad -> sanitarias -> climatización.
`;


/**
 * Limpia una cadena que se espera contenga JSON, eliminando los delimitadores de markdown
 * y extrayendo solo el objeto JSON principal.
 * @param rawString La respuesta de texto crudo de la IA.
 * @returns Una cadena JSON limpia.
 */
function cleanJsonString(rawString: string): string {
    let cleaned = rawString.replace(/```json/g, "").replace(/```/g, "");
    const startIndex = cleaned.indexOf("{");
    const endIndex = cleaned.lastIndexOf("}");
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error("No se encontró un objeto JSON válido en la respuesta de la IA.");
    }
    return cleaned.substring(startIndex, endIndex + 1);
}

// --- Función para llamar a la API de Gemini (actualizada) ---
async function callGeminiAPI(apiKey: string, parts: any[]) {
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0.1,
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
            return; 
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

            await jobRef.update({ status: 'processing', updatedAt: admin.firestore.FieldValue.serverTimestamp() });

            const [planoA, planoB] = await Promise.all([
                getPlanoAsDataUri(planoA_storagePath),
                getPlanoAsDataUri(planoB_storagePath)
            ]);
            
            const planoA_part = { inline_data: { mime_type: planoA.mimeType, data: planoA.data } };
            const planoB_part = { inline_data: { mime_type: planoB.mimeType, data: planoB.data } };

            await jobRef.update({ status: 'running_ai', updatedAt: admin.firestore.FieldValue.serverTimestamp() });

            // Ejecutar el análisis monolítico con una sola llamada
            const analysisResult = await callGeminiAPI(apiKey, [{ text: monolithicPromptText }, planoA_part, planoB_part]);
            
            // Finalizar guardando el resultado completo
            await jobRef.update({
                results: analysisResult,
                status: 'completed',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            logger.info(`[${jobId}] Análisis de comparación completado exitosamente con un solo agente.`);

        } catch (error: any) {
            logger.error(`[${jobId}] Error durante el análisis:`, error);
            await jobRef.update({
                status: 'error',
                errorMessage: { code: "ANALYSIS_FAILED", message: error.message },
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });
