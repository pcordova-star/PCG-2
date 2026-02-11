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
exports.processNoticiaExterna = void 0;
// workspace/functions/src/processNoticiaExterna.ts
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const zod_1 = require("zod");
const node_fetch_1 = __importDefault(require("node-fetch"));
// Esquema de Salida de la IA
const NoticiaAnalisisSchema = zod_1.z.object({
    resumen: zod_1.z.string().describe("Un resumen ejecutivo de la noticia en 2-3 frases."),
    especialidad: zod_1.z.array(zod_1.z.enum(['Seguridad', 'Legal', 'Mercado', 'Logística', 'General'])).describe("Clasificación de la noticia."),
    relevanciaGeografica: zod_1.z.array(zod_1.z.string()).describe("Regiones, comunas o 'Nacional' si aplica."),
    entidadesPcgImpactadas: zod_1.z.array(zod_1.z.enum(['admin_empresa', 'jefe_obra', 'prevencionista'])).describe("Roles de usuario que deberían ver esta noticia."),
    accionRecomendada: zod_1.z.string().describe("Una acción concreta y verificable que un usuario de PCG podría tomar."),
    esCritica: zod_1.z.boolean().describe("True si la noticia representa un riesgo o una oportunidad inmediata."),
});
function cleanJsonString(rawString) {
    let cleaned = rawString.replace(/```json/g, "").replace(/```/g, "");
    const startIndex = cleaned.indexOf("{");
    const endIndex = cleaned.lastIndexOf("}");
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error("No se encontró un objeto JSON válido en la respuesta de la IA.");
    }
    return cleaned.substring(startIndex, endIndex + 1);
}
async function callGeminiForNoticia(apiKey, contenidoCrudo) {
    const prompt = `
      Eres un analista experto en inteligencia operacional para la industria de la construcción en Chile.
      Tu tarea es leer una noticia y transformarla en una alerta de inteligencia accionable para una plataforma de gestión de obras llamada PCG.
      
      La noticia cruda es:
      ---
      ${contenidoCrudo}
      ---
      
      Analiza el contenido y genera un objeto JSON que siga estrictamente el schema de salida, sin texto adicional. Tu respuesta DEBE ser solo el JSON.
      - **resumen**: Crea un resumen conciso y directo.
      - **especialidad**: Clasifica la noticia. Puede tener múltiples especialidades.
      - **relevanciaGeografica**: Identifica las zonas geográficas afectadas. Si es para todo Chile, usa "Nacional".
      - **entidadesPcgImpactadas**: Determina qué roles son los más afectados por esta noticia.
      - **accionRecomendada**: La parte más importante. Sugiere una acción CLARA, CORTA y CONCRETA que un usuario pueda realizar DENTRO de la plataforma PCG. No sugieras "informarse" o "estar atento".
      - **esCritica**: Define si la noticia es de alta urgencia.
    `;
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    const response = await (0, node_fetch_1.default)(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                response_mime_type: "application/json",
                temperature: 0.2,
            },
        }),
    });
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error en API Gemini: ${response.statusText}. Detalle: ${errText}`);
    }
    const result = await response.json();
    const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson)
        throw new Error("La respuesta de Gemini no contiene texto JSON válido.");
    const cleanedJson = cleanJsonString(rawJson);
    const parsed = NoticiaAnalisisSchema.parse(JSON.parse(cleanedJson));
    return parsed;
}
const adminApp = (0, firebaseAdmin_1.getAdminApp)();
const db = adminApp.firestore();
exports.processNoticiaExterna = functions
    .region("us-central1")
    .runWith({ secrets: ["GOOGLE_GENAI_API_KEY"] })
    .firestore.document("noticiasExternas/{noticiaId}")
    .onCreate(async (snap, context) => {
    const { noticiaId } = context.params;
    const noticiaData = snap.data();
    if (!noticiaData || !noticiaData.contenidoCrudo) {
        logger.log(`[${noticiaId}] No hay contenido para analizar.`);
        return;
    }
    logger.info(`[${noticiaId}] Iniciando análisis de IA para la noticia.`);
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        logger.error(`[${noticiaId}] GOOGLE_GENAI_API_KEY no está configurada.`);
        await snap.ref.update({ estado: 'error_config', errorMessage: 'API Key no configurada en el servidor.' });
        return;
    }
    try {
        const analisisResult = await callGeminiForNoticia(apiKey, noticiaData.contenidoCrudo);
        // Guardar el resultado exitoso
        await snap.ref.collection("analisisIA").doc("ultimo").set({
            ...analisisResult,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            jobId: context.eventId,
        });
        logger.info(`[${noticiaId}] Análisis de IA completado y guardado.`);
    }
    catch (error) {
        logger.error(`[${noticiaId}] Error al procesar con IA:`, error);
        // Guardar el estado de error
        await snap.ref.update({
            estado: 'error_ia',
            errorMessage: error.message || "Error desconocido durante el análisis de IA.",
        });
    }
});
//# sourceMappingURL=processNoticiaExterna.js.map