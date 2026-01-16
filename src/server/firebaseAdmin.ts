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

  // En entornos de despliegue como Vercel, Firebase Admin SDK detectará
  // automáticamente las credenciales desde las variables de entorno si no se
  // pasa un `credential` explícito. Esto evita errores de parseo de JSON.
  // Solo necesitamos especificar el bucket de almacenamiento.
  admin.initializeApp({
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  return admin;
}
