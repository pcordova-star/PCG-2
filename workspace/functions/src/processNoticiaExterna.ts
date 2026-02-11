// workspace/functions/src/processNoticiaExterna.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { getAdminApp } from './firebaseAdmin';
import { z } from 'zod';
import { configureGenkit } from '@genkit-ai/core';
import { googleAI, generate } from '@genkit-ai/googleai';

// Esquema de Salida de la IA
const NoticiaAnalisisSchema = z.object({
  resumen: z.string().describe("Un resumen ejecutivo de la noticia en 2-3 frases."),
  especialidad: z.array(z.enum(['Seguridad', 'Legal', 'Mercado', 'Logística', 'General'])).describe("Clasificación de la noticia."),
  relevanciaGeografica: z.array(z.string()).describe("Regiones, comunas o 'Nacional' si aplica."),
  entidadesPcgImpactadas: z.array(z.enum(['admin_empresa', 'jefe_obra', 'prevencionista'])).describe("Roles de usuario que deberían ver esta noticia."),
  accionRecomendada: z.string().describe("Una acción concreta y verificable que un usuario de PCG podría tomar."),
  esCritica: z.boolean().describe("True si la noticia representa un riesgo o una oportunidad inmediata."),
});

// Configuración de Genkit
configureGenkit({
    plugins: [
        googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY }),
    ],
    logLevel: 'debug',
    enableTracingAndMetrics: true,
});

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
    
    logger.info(`[${noticiaId}] Iniciando análisis de IA para la noticia.`);

    const prompt = `
      Eres un analista experto en inteligencia operacional para la industria de la construcción en Chile.
      Tu tarea es leer una noticia y transformarla en una alerta de inteligencia accionable para una plataforma de gestión de obras llamada PCG.
      
      La noticia cruda es:
      ---
      ${noticiaData.contenidoCrudo}
      ---
      
      Analiza el contenido y genera un objeto JSON que siga estrictamente el schema de salida, sin texto adicional. Tu respuesta DEBE ser solo el JSON.
      - **resumen**: Crea un resumen conciso y directo.
      - **especialidad**: Clasifica la noticia. Puede tener múltiples especialidades.
      - **relevanciaGeografica**: Identifica las zonas geográficas afectadas. Si es para todo Chile, usa "Nacional".
      - **entidadesPcgImpactadas**: Determina qué roles son los más afectados por esta noticia.
      - **accionRecomendada**: La parte más importante. Sugiere una acción CLARA, CORTA y CONCRETA que un usuario pueda realizar DENTRO de la plataforma PCG. No sugieras "informarse" o "estar atento".
      - **esCritica**: Define si la noticia es de alta urgencia.
    `;

    try {
      const llmResponse = await generate({
        model: 'gemini-pro',
        prompt: prompt,
        output: {
            format: 'json',
            schema: NoticiaAnalisisSchema,
        },
        config: {
            temperature: 0.2,
        }
      });
      
      const analisisResult = llmResponse.output();
      if (!analisisResult) {
        throw new Error("La respuesta de la IA fue vacía o inválida.");
      }
      
      // Guardar el resultado exitoso
      await snap.ref.collection("analisisIA").doc("ultimo").set({
        ...analisisResult,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        jobId: context.eventId,
      });

      logger.info(`[${noticiaId}] Análisis de IA completado y guardado.`);

    } catch (error: any) {
      logger.error(`[${noticiaId}] Error al procesar con IA:`, error);
      // Guardar el estado de error
      await snap.ref.update({
        estado: 'error_ia',
        errorMessage: error.message || "Error desconocido durante el análisis de IA.",
      });
    }
  });
