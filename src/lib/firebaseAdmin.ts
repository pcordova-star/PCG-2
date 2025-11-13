// src/lib/firebaseAdmin.ts
import 'server-only'
import { App, cert, getApps, initializeApp } from 'firebase-admin/app'

// Variable para almacenar la instancia de la app (singleton)
let app: App | null = null;

export function getAdminApp(): App {
  // Si ya tenemos una instancia, la devolvemos
  if (app) return app;

  // Si ya hay apps inicializadas por otro medio, usa la primera
  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }
  
  // Lee las credenciales desde las variables de entorno
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  // Valida que todas las variables necesarias estén presentes
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Las variables de entorno de Firebase Admin no están configuradas. Asegúrate de definir FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL y FIREBASE_ADMIN_PRIVATE_KEY."
    );
  }

  // Inicializa la app con las credenciales
  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return app;
}
