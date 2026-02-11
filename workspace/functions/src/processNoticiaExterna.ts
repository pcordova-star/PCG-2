// workspace/functions/src/processNoticiaExterna.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { getAdminApp } from './firebaseAdmin';
import { z } from 'zod';
import { ai } from './genkit-config'; // Importar la instancia 'ai' centralizada

// --- Esquema de Salida de la IA ---
const NoticiaAnalisisSchema = z.object({
  resumen: z.string().describe("Un resumen ejecutivo de la noticia en 2-3 frases."),
  especialidad: z.array(z.enum(['Seguridad', 'Legal', 'Mercado', 'Logística', 'General'])).describe("Clasificación de la noticia en una o más especialidades relevantes para la construcción."),
  relevanciaGeografica: z.array(z.string()).describe("Regiones, comunas o 'Nacional' si aplica. Ej: ['RM', 'Valparaíso']."),
  entidadesPcgImpactadas: z.array(z.enum(['admin_empresa', 'jefe_obra', 'prevencionista'])).describe("Roles de usuario en PCG que deberían ver esta noticia."),
  accionRecomendada: z.string().describe("Una acción concreta y verificable que un usuario de PCG podría tomar. Ej: 'Verificar stock de acero', 'Programar charla sobre nueva normativa de andamios'."),
  esCritica: z.boolean().describe("True si la noticia representa un riesgo o una oportunidad inmediata que requiere atención urgente."),
});

// --- Inicialización de Servicios ---
const adminApp = getAdminApp();
const db = adminApp.firestore();

const analizarNoticiaPrompt = ai.definePrompt(
  {
    name: "analizarNoticiaPrompt",
    input: { schema: z.string() },
    output: { schema: NoticiaAnalisisSchema },
    prompt: `
      Eres un analista experto en inteligencia operacional para la industria de la construcción en Chile.
      Tu tarea es leer una noticia y transformarla en una alerta de inteligencia accionable para una plataforma de gestión de obras llamada PCG.
      
      La noticia cruda es:
      ---
      {{{input}}}
      ---
      
      Analiza el contenido y genera un objeto JSON que siga estrictamente el schema de salida, sin texto adicional. Tu respuesta DEBE ser solo el JSON.
      - **resumen**: Crea un resumen conciso y directo.
      - **especialidad**: Clasifica la noticia. Puede tener múltiples especialidades.
      - **relevanciaGeografica**: Identifica las zonas geográficas afectadas. Si es para todo Chile, usa "Nacional".
      - **entidadesPcgImpactadas**: Determina qué roles son los más afectados por esta noticia.
      - **accionRecomendada**: La parte más importante. Sugiere una acción CLARA, CORTA y CONCRETA que un usuario pueda realizar DENTRO de la plataforma PCG. No sugieras "informarse" o "estar atento".
      - **esCritica**: Define si la noticia es de alta urgencia.
    `,
  },
);

// --- Cloud Function ---
export const processNoticiaExterna = functions
  .region("us-central1")
  .runWith({ secrets: ["GOOGLE_GENAI_API_KEY"] }) // Habilita la clave de API en el entorno.
  .firestore.document("noticiasExternas/{noticiaId}")
  .onCreate(async (snap, context) => {
    const { noticiaId } = context.params;
    const noticiaData = snap.data();

    if (!noticiaData || !noticiaData.contenidoCrudo) {
      logger.log(`[${noticiaId}] No hay contenido para analizar.`);
      return;
    }
    
    logger.info(`[${noticiaId}] Iniciando análisis de IA para la noticia.`);

    try {
      const { output } = await analizarNoticiaPrompt(noticiaData.contenidoCrudo);
      
      if (!output) {
        throw new Error("La IA no generó una respuesta válida.");
      }

      await snap.ref.collection("analisisIA").doc("ultimo").set({
        ...output,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        jobId: context.eventId,
      });

      logger.info(`[${noticiaId}] Análisis de IA completado y guardado.`);
      
    } catch (error: any) {
      logger.error(`[${noticiaId}] Error al procesar con IA:`, error);
      await snap.ref.update({
        estado: 'error_ia',
        errorMessage: error.message,
      });
    }
  });
