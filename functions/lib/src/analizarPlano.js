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
Object.defineProperty(exports, "__esModule", { value: true });
exports.analizarPlano = void 0;
// src/functions/src/analizarPlano.ts
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const genkit_config_1 = require("./genkit-config");
const zod_1 = require("zod");
const params_1 = require("./params");
// --- Schemas (copiados desde /types/analisis-planos.ts para desacoplar) ---
const OpcionesAnalisisSchema = zod_1.z.object({
    superficieUtil: zod_1.z.boolean(), m2Muros: zod_1.z.boolean(), m2Losas: zod_1.z.boolean(),
    m2Revestimientos: zod_1.z.boolean(), instalacionesHidraulicas: zod_1.z.boolean(), instalacionesElectricas: zod_1.z.boolean(),
});
const AnalisisPlanoInputSchema = zod_1.z.object({
    photoDataUri: zod_1.z.string(),
    opciones: OpcionesAnalisisSchema,
    notas: zod_1.z.string().optional(),
    obraId: zod_1.z.string(),
    obraNombre: zod_1.z.string(),
    companyId: zod_1.z.string(),
    planType: zod_1.z.string(),
});
const ElementoAnalizadoSchema = zod_1.z.object({
    type: zod_1.z.string(), name: zod_1.z.string(), unit: zod_1.z.string(),
    estimatedQuantity: zod_1.z.number(), confidence: zod_1.z.number(), notes: zod_1.z.string(),
});
const AnalisisPlanoOutputSchema = zod_1.z.object({
    summary: zod_1.z.string(),
    elements: zod_1.z.array(ElementoAnalizadoSchema),
});
const AnalisisPlanoInputWithOpcionesStringSchema = AnalisisPlanoInputSchema.extend({
    opcionesString: zod_1.z.string(),
});
// --- Cloud Function v2 onCall ---
exports.analizarPlano = (0, https_1.onCall)({
    region: "us-central1",
    timeoutSeconds: 300,
    memory: '1GiB',
    secrets: [params_1.GEMINI_API_KEY_SECRET],
    cors: [
        "https://pcgoperacion.com",
        /https:\/\/.*\.firebase-studio\.app$/,
        "http://localhost:3000",
    ],
}, async (request) => {
    // Autenticación básica
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }
    // Validación de entrada con Zod
    const validationResult = AnalisisPlanoInputSchema.safeParse(request.data);
    if (!validationResult.success) {
        logger.error("Invalid input for analizarPlano", validationResult.error.flatten());
        throw new https_1.HttpsError("invalid-argument", "Los datos proporcionados son inválidos.");
    }
    const input = validationResult.data;
    try {
        // Se inicializa genkit dentro para asegurar que process.env.GEMINI_API_KEY esté disponible
        const ai = (0, genkit_config_1.getInitializedGenkitAi)();
        logger.info(`[analizarPlano - ${request.auth.uid}] Iniciando análisis para obra: ${input.obraNombre}`);
        const analizarPlanoPrompt = ai.definePrompt({
            name: 'analizarPlanoPromptFunction',
            model: 'googleai/gemini-1.5-flash-latest',
            input: { schema: AnalisisPlanoInputWithOpcionesStringSchema },
            output: { schema: AnalisisPlanoOutputSchema },
            prompt: `Eres un asistente experto en análisis de planos. Tu respuesta DEBE SER EXCLUSIVAMENTE un objeto JSON válido.
          
          Información:
          - Plano: {{media url=photoDataUri}}
          - Opciones de análisis: {{{opcionesString}}}
          - Notas del usuario: {{{notas}}}
          - Obra: {{{obraNombre}}} (ID: {{{obraId}}})

          Genera el JSON de salida.`
        });
        const { output } = await analizarPlanoPrompt({
            ...input,
            opcionesString: JSON.stringify(input.opciones),
        });
        if (!output) {
            throw new Error("La IA no devolvió una respuesta válida.");
        }
        logger.info(`[analizarPlano - ${request.auth.uid}] Análisis completado con éxito.`);
        return { result: output };
    }
    catch (error) {
        logger.error(`[analizarPlano - ${request.auth.uid}] Error en Genkit o en la lógica de la función:`, error);
        throw new https_1.HttpsError("internal", "Ocurrió un error al procesar el análisis con IA.", error.message);
    }
});
