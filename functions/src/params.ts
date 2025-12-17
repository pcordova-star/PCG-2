// functions/src/params.ts
import { defineSecret } from 'firebase-functions/params';

/**
 * Define el secreto para la API Key de Gemini.
 * Este objeto será importado y vinculado a las funciones que necesiten acceso.
 * El nombre 'GEMINI_API_KEY' debe coincidir con el nombre del secreto en Google Secret Manager.
 */
export const GEMINI_API_KEY_SECRET = defineSecret('GEMINI_API_KEY');
