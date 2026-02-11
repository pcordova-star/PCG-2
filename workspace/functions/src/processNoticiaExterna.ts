// workspace/functions/src/processNoticiaExterna.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { getAdminApp } from './firebaseAdmin';
import { z } from 'zod';

// Genkit imports
import { configureGenkit, defineFlow, run } from '@genkit-ai/core';
import { googleAI, geminiPro } from '@genkit-ai/googleai';

// --- Esquema de Salida de la IA (sin cambios) ---
const NoticiaAnalisisSchema = z.object({
  resumen: z.string().describe("Un resumen ejecutivo de la noticia en 2-3 frases."),
  especialidad: z.array(z.enum(['Seguridad', 'Legal', 'Mercado', 'Logística', 'General'])).describe("Clasificación de la noticia en una o más especialidades relevantes para la construcción."),
  relevanciaGeografica: z.array(z.string()).describe("Regiones, comunas o 'Nacional' si aplica. Ej: ['RM', 'Valparaíso']."),
  entidadesPcgImpactadas: z.array(z.enum(['admin_empresa', 'jefe_obra', 'prevencionista'])).describe("Roles de usuario en PCG que deberían ver esta noticia."),
  accionRecomendada: z.string().describe("Una acción concreta y verificable que un usuario de PCG podría tomar. Ej: 'Verificar stock de acero', 'Programar charla sobre nueva normativa de andamios'."),
  esCritica: z.boolean().describe("True si la noticia representa un riesgo o una oportunidad inmediata que requiere atención urgente."),
});

// --- Genkit Configuration (para el entorno de la Cloud Function) ---
configureGenkit({
    plugins: [
        googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY }),
    ],
    logLevel: 'debug',
    enableTracingAndMetrics: true,
});

// --- El Genkit Flow ---
const analizarNoticiaFlow = defineFlow(
  {
    name: 'analizarNoticiaFlow',
    inputSchema: z.string(),
    outputSchema: NoticiaAnalisisSchema,
  },
  async (contenidoCrudo) => {
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
    
    // La llamada a la IA se hace a través del modelo, dentro del flow
    const llmResponse = await geminiPro.generate({
        prompt: prompt,
        output: {
            format: 'json',
            schema: NoticiaAnalisisSchema,
        },
        config: {
            temperature: 0.2,
        }
    });

    const output = llmResponse.output();
    if (!output) {
      throw new Error("La IA no generó una respuesta válida (output está vacío).");
    }
    return output;
  }
);

// --- Cloud Function Trigger ---
const adminApp = getAdminApp();
const db = adminApp.firestore();

export const processNoticiaExterna = functions
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
    
    logger.info(`[${noticiaId}] Iniciando análisis de IA para la noticia a través de un Flow.`);

    try {
      // Ejecutar el flow de Genkit de forma segura
      const analisisResult = await run(analizarNoticiaFlow, noticiaData.contenidoCrudo);
      
      // Guardar el resultado exitoso
      await snap.ref.collection("analisisIA").doc("ultimo").set({
        ...analisisResult,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        jobId: context.eventId,
      });

      logger.info(`[${noticiaId}] Análisis de IA completado y guardado.`);

    } catch (error: any) {
      logger.error(`[${noticiaId}] Error al procesar con IA Flow:`, error);
      // Guardar el estado de error sin romper la función
      await snap.ref.update({
        estado: 'error_ia',
        errorMessage: error.message || "Error desconocido durante el análisis de IA.",
      });
    }
  });