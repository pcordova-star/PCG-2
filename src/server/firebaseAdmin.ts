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
    // Se utiliza una variable de entorno de SERVIDOR, no una pública.
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;

    // Validamos que la variable de entorno necesaria exista.
    if (!bucketName) {
      throw new Error("La variable de entorno del servidor FIREBASE_STORAGE_BUCKET no está configurada.");
    }
    
    // Inicializamos la app de Admin.
    // El SDK puede inferir projectId y credenciales del entorno de Vercel (ADC).
    admin.initializeApp({
      storageBucket: bucketName.replace(/^gs:\/\//, ""), // Limpiamos el prefijo si existe
    });

  } catch (error: any) {
    throw new Error(`Error al inicializar Firebase Admin: ${error.message}`);
  }

  return admin;
}
