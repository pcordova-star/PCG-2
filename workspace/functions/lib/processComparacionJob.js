"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processComparacionJob = void 0;
// workspace/functions/src/processComparacionJob.ts
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const node_fetch_1 = __importDefault(require("node-fetch"));
const storage_1 = require("./lib/storage");
const adminApp = (0, firebaseAdmin_1.getAdminApp)();
const db = adminApp.firestore();
// --- Prompts corregidos sin placeholders ---
const diffPromptText = `Eres un experto en interpretación de planos de construcción.
Tu tarea es comparar dos imágenes: Plano A (versión original) y Plano B (versión modificada).
Debes identificar todas las diferencias visuales, geométricas, textuales y de anotaciones entre ambos.
A continuación se presentan el Plano A y luego el Plano B.

Instrucciones:
1.  Analiza detalladamente ambas imágenes.
2.  Para cada diferencia encontrada, crea un objeto "DiffElemento".
3.  Clasifica cada diferencia en "tipo" como 'agregado', 'eliminado' o 'modificado'.
4.  Describe el cambio de forma clara y concisa en el campo "descripcion".
5.  Si es aplicable, indica la ubicación aproximada del cambio en el campo "ubicacion".
6.  Genera un "resumen" conciso de los cambios más importantes.
7.  Tu respuesta DEBE SER EXCLUSIVAMENTE un objeto JSON válido que siga la estructura de salida, sin texto adicional.`;
const cubicacionPromptText = `Eres un experto en cubicación y presupuestos de construcción.
Tu tarea es analizar dos versiones de un plano, Plano A (original) y Plano B (modificado), para detectar variaciones en las cantidades de obra.
A continuación se presentan el Plano A y luego el Plano B.

Instrucciones:
1.  Compara las dos imágenes y detecta cambios que afecten las cantidades de obra (superficies, volúmenes, longitudes, unidades).
2.  Para cada "partida" afectada, genera un objeto "CubicacionPartida".
3.  Define la "unidad" correspondiente (m2, m3, ml, u, kg, etc.).
4.  Indica la cantidad en el Plano A ("cantidadA") y en el Plano B ("cantidadB"). Si una cantidad no existe o no es aplicable (ej. en un elemento nuevo), déjala como null.
5.  Calcula la "diferencia" (cantidadB - cantidadA).
6.  Agrega "observaciones" si es necesario para aclarar un cálculo o suposición.
7.  Genera un "resumen" de las variaciones más significativas.
8.  Tu respuesta DEBE SER EXCLUSIVAMENTE un objeto JSON válido que siga el esquema de salida, sin texto adicional.`;
const impactoPromptText = `Eres un Jefe de Proyectos experto con 20 años de experiencia coordinando especialidades.
Tu tarea es analizar las diferencias entre dos planos para generar un árbol jerárquico de impactos técnicos.
A continuación se presentan el Plano A y luego el Plano B, junto con contexto adicional.

Contexto Adicional (Resultados de análisis previos):
---
RESUMEN DE DIFERENCIAS TÉCNICAS:
{{diffContext.resumen}}

RESUMEN DE VARIACIONES DE CUBICACIÓN:
{{cubicacionContext.resumen}}
---

Instrucciones:
1.  Basado en el contexto y las imágenes, identifica los cambios primarios (usualmente en arquitectura).
2.  Para cada cambio, analiza su efecto en cascada sobre otras especialidades en el orden: arquitectura -> estructura -> electricidad -> sanitarias -> climatización.
3.  Crea un nodo "ImpactoNode" para cada especialidad afectada.
4.  Describe el "impactoDirecto" y el "impactoIndirecto" (cómo afecta a otras áreas).
5.  Evalúa la "severidad" como "baja", "media" o "alta".
6.  Identifica el principal "riesgo" (ej: "Sobrecosto", "Atraso", "Incompatibilidad").
7.  Lista "consecuencias" y "recomendaciones".
8.  Si un impacto genera otros, anídalos en "subImpactos".
9.  Tu respuesta DEBE SER EXCLUSIVAMENTE un objeto JSON válido con la estructura de salida, sin texto adicional.`;
/**
 * Limpia una cadena que se espera contenga JSON, eliminando los delimitadores de markdown
 * y extrayendo solo el objeto JSON principal.
 * @param rawString La respuesta de texto crudo de la IA.
 * @returns Una cadena JSON limpia.
 */
function cleanJsonString(rawString) {
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
// --- Función para llamar a la API de Gemini ---
async function callGeminiAPI(apiKey, parts) {
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await (0, node_fetch_1.default)(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { response_mime_type: "application/json" },
        }),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error?.message || "Error desconocido en API Gemini");
    }
    const result = await response.json();
    const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson)
        throw new Error("La respuesta de Gemini no contiene texto JSON válido.");
    // Limpiar la respuesta antes de parsear
    const cleanedJson = cleanJsonString(rawJson);
    return JSON.parse(cleanedJson);
}
// --- Cloud Function principal ---
exports.processComparacionJob = functions
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
            (0, storage_1.getPlanoAsDataUri)(planoA_storagePath),
            (0, storage_1.getPlanoAsDataUri)(planoB_storagePath)
        ]);
        const planoA_part = { inline_data: { mime_type: planoA.mimeType, data: planoA.data } };
        const planoB_part = { inline_data: { mime_type: planoB.mimeType, data: planoB.data } };
        // 2. Ejecutar análisis de Diff y Cubicación en paralelo
        await jobRef.update({ status: 'analyzing-diff', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        const [diffResult, cubicacionResult] = await Promise.all([
            callGeminiAPI(apiKey, [{ text: diffPromptText }, planoA_part, planoB_part]),
            callGeminiAPI(apiKey, [{ text: cubicacionPromptText }, planoA_part, planoB_part])
        ]);
        await jobRef.update({
            'results.diffTecnico': diffResult,
            'results.cubicacionDiferencial': cubicacionResult,
            status: 'generating-impactos',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // 3. Ejecutar análisis de Impactos con el contexto de los anteriores
        let impactoPromptFinal = impactoPromptText.replace('{{diffContext.resumen}}', diffResult.resumen || 'N/A');
        impactoPromptFinal = impactoPromptFinal.replace('{{cubicacionContext.resumen}}', cubicacionResult.resumen || 'N/A');
        const impactosResult = await callGeminiAPI(apiKey, [{ text: impactoPromptFinal }, planoA_part, planoB_part]);
        // 4. Finalizar
        await jobRef.update({
            'results.arbolImpactos': impactosResult,
            status: 'completed',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(`[${jobId}] Análisis de comparación completado exitosamente.`);
    }
    catch (error) {
        logger.error(`[${jobId}] Error durante el análisis:`, error);
        await jobRef.update({
            status: 'error',
            errorMessage: { code: "ANALYSIS_FAILED", message: error.message },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
});
//# sourceMappingURL=processComparacionJob.js.map