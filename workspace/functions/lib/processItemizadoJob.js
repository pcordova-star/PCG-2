"use strict";
// workspace/functions/src/processItemizadoJob.ts
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
exports.processPresupuestoPdf = void 0;
const storage_1 = require("firebase-functions/v2/storage");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const node_fetch_1 = __importDefault(require("node-fetch"));
const db = (0, firebaseAdmin_1.getAdminApp)().firestore();
function cleanJsonString(rawString) {
    // 1. Quitar bloques de código Markdown (```json ... ```)
    let cleaned = rawString.replace(/```json/g, "").replace(/```/g, "");
    // 2. Encontrar el primer '{' y el último '}' para ignorar texto basura al inicio/final
    const startIndex = cleaned.indexOf("{");
    const endIndex = cleaned.lastIndexOf("}");
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error("Respuesta de IA no contenía un objeto JSON válido (faltan '{' o '}').");
    }
    cleaned = cleaned.substring(startIndex, endIndex + 1);
    // 3. Quitar comas sobrantes (trailing commas) antes de corchetes y llaves de cierre.
    // Esta es la causa más común de errores de parseo con JSON de IA.
    cleaned = cleaned.replace(/,\s*(]|})/g, "$1");
    return cleaned;
}
exports.processPresupuestoPdf = (0, storage_1.onObjectFinalized)({ memory: "2GiB", timeoutSeconds: 540, secrets: ["GOOGLE_GENAI_API_KEY"] }, async (event) => {
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
    const jobData = jobSnap.data();
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
        const response = await (0, node_fetch_1.default)(geminiEndpoint, {
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
        const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;
        await jobRef.update({ rawAiResult: rawJson, status: "normalizing_result", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        if (!rawJson)
            throw new Error("La respuesta de Gemini no contiene texto JSON válido.");
        let parsed;
        try {
            parsed = JSON.parse(cleanJsonString(rawJson));
        }
        catch (e) {
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
    }
    catch (err) {
        logger.error(`[${jobId}] Error processing job:`, err);
        await jobRef.update({
            status: 'error',
            errorMessage: err.message || "Error desconocido durante el procesamiento.",
            finishedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
});
//# sourceMappingURL=processItemizadoJob.js.map