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

  // Si no hay app, la inicializamos.
  // Esta versión simplificada confía en las credenciales por defecto de la aplicación (ADC),
  // que es la forma recomendada en entornos como Vercel o Google Cloud.
  try {
    // Usamos la variable de entorno para el bucket, eliminando el prefijo 'gs://' si existe.
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    
    admin.initializeApp({
        // El SDK Admin puede inferir las credenciales desde el entorno de Vercel (ADC)
        // pero especificar el bucket es una buena práctica para asegurar la consistencia.
        storageBucket: bucketName?.replace(/^gs:\/\//, ""),
    });
  } catch (error: any) {
    throw new Error(`Error al inicializar Firebase Admin: ${error.message}`);
  }

  return admin;
}
