// functions/gen2/src/params.ts
import { defineSecret } from "firebase-functions/params";

/**
 * Define el secreto para la API Key de Gemini para las funciones de 2da Gen.
 */
export const GEMINI_API_KEY_SECRET = defineSecret('GEMINI_API_KEY');
