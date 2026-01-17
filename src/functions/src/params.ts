// src/functions/src/params.ts
import { defineSecret } from 'firebase-functions/params';

/**
 * Define el secreto para la API Key de Gemini.
 * Esto permite que las Cloud Functions de 2ª Generación accedan al secreto de forma segura.
 */
export const GEMINI_API_KEY_SECRET = defineSecret('GEMINI_API_KEY');
