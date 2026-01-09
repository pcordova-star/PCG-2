// src/functions/src/params.ts
import { defineString } from 'firebase-functions/params';

// Define el parámetro que buscará el secreto 'GEMINI_API_KEY'
export const GEMINI_API_KEY_SECRET = defineString('GEMINI_API_KEY');
