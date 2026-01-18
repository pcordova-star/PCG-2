// src/functions/src/params.ts
import { defineSecret } from 'firebase-functions/params';

/**
 * Define el secreto para la API Key de Gemini con un nombre único para el proyecto.
 * Esto permite que las Cloud Functions de 2ª Generación accedan al secreto de forma segura y evita conflictos.
 */
export const PPCG_GEMINI_API_KEY_SECRET = defineSecret('PPCG_GEMINI_API_KEY_V2');
