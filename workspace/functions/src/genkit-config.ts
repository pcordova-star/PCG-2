// functions/src/genkit-config.ts
import { genkit, Genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as logger from "firebase-functions/logger";
import { GEMINI_API_KEY_SECRET } from './params'; // Importar el parámetro del secreto

let aiInstance: Genkit | null = null;

/**
 * Obtiene una instancia inicializada de Genkit AI.
 * La inicialización es diferida (lazy) para asegurar que las variables de entorno (secretos)
 * estén disponibles en el momento de la ejecución de la función, no durante la carga del módulo.
 * 
 * @returns Una instancia de Genkit configurada.
 */
export function getInitializedGenkitAi(): Genkit {
  // Memoization simple para evitar reinicializar en una instancia "caliente" (warm instance).
  if (aiInstance) {
    return aiInstance;
  }

  const apiKey = GEMINI_API_KEY_SECRET.value();
  
  // Log de diagnóstico en tiempo de ejecución
  const apiKeyExists = !!apiKey;
  logger.info(`[getInitializedGenkitAi] Verificación de API Key en runtime: Existe=${apiKeyExists}, Longitud=${apiKey?.length || 0}`);

  if (!apiKeyExists) {
    // Es crucial lanzar un error si la clave no está, para que la función falle explícitamente.
    throw new Error("GEMINI_API_KEY no está disponible en el entorno de ejecución de la función.");
  }
  
  aiInstance = genkit({
    plugins: [
      googleAI({ apiKey })
    ]
  });

  return aiInstance;
}
