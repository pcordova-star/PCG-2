import admin from "firebase-admin";
import { Timestamp } from 'firebase-admin/firestore';

// Solo inicializamos si no lo hemos hecho antes y si la variable de entorno existe.
if (!admin.apps.length) {
  if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    } catch (e: any) {
      console.error('Error al inicializar Firebase Admin SDK:', e.message);
      // No lanzamos error para permitir el build, pero logueamos el problema.
    }
  } else {
    // Esto se mostrará durante el build de Vercel si la variable no está.
    console.warn("ADVERTENCIA: FIREBASE_ADMIN_SERVICE_ACCOUNT no está configurada. Las API Routes que usan Firebase Admin no funcionarán.");
  }
}

export const adminDb = admin.firestore();
export default admin;
export const FieldValue = admin.firestore.FieldValue;
export { Timestamp };
