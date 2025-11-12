// src/lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

// Lee las credenciales del servicio desde las variables de entorno.
// Esto es más seguro que tener un archivo de credenciales en el código fuente.
const serviceAccount: admin.ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID!,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
  // Reemplaza los escapes de nueva línea con saltos de línea reales.
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
};

// Función idempotente para obtener la app de Firebase Admin.
// Evita inicializar la app múltiples veces en entornos sin servidor.
export function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Función para obtener la instancia de Firestore desde la app de Admin.
export function getAdminFirestore(): admin.firestore.Firestore {
  return getAdminApp().firestore();
}

// Función para obtener la instancia de Auth desde la app de Admin.
export function getAdminAuth(): admin.auth.Auth {
  return getAdminApp().auth();
}
