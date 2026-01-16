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
    // Usamos las variables de entorno públicas que ya están definidas para el cliente.
    // Esto asegura consistencia entre el frontend y el backend.
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    // Validamos que las variables de entorno necesarias existan.
    if (!projectId) {
      throw new Error("La variable de entorno NEXT_PUBLIC_FIREBASE_PROJECT_ID no está configurada.");
    }
    if (!bucketName) {
      throw new Error("La variable de entorno NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET no está configurada.");
    }
    
    // Inicializamos la app de Admin con la configuración explícita.
    // El SDK Admin puede inferir las credenciales desde el entorno de Vercel (ADC).
    admin.initializeApp({
      projectId: projectId,
      storageBucket: bucketName.replace(/^gs:\/\//, ""), // Limpiamos el prefijo si existe
    });

  } catch (error: any) {
    throw new Error(`Error al inicializar Firebase Admin: ${error.message}`);
  }

  return admin;
}
