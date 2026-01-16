// src/server/firebaseAdmin.ts
// THIS FILE IS SERVER-ONLY. DO NOT IMPORT IT IN CLIENT COMPONENTS OR PAGES.

import * as admin from "firebase-admin";

/**
 * Obtiene una instancia inicializada y segura de Firebase Admin.
 * Utiliza un patrón de inicialización diferida (lazy initialization) para ser
 * compatible con entornos serverless como Vercel.
 *
 * @returns La instancia de Firebase Admin.
 */
export function getAdminApp(): typeof admin {
  // Si ya hay una app inicializada (en una instancia "caliente"), la reutilizamos.
  if (admin.apps.length > 0) {
    return admin;
  }

  try {
    // Se inicializa con ADC, pero se especifica explícitamente el bucket de Storage
    // para evitar problemas en entornos de despliegue donde la detección automática puede fallar.
    admin.initializeApp({
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });

  } catch (error: any) {
    throw new Error(`Error al inicializar Firebase Admin: ${error.message}`);
  }

  return admin;
}
