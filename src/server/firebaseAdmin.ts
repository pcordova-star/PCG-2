import admin from "firebase-admin";
import { Timestamp } from 'firebase-admin/firestore';

// Solo inicializamos si no lo hemos hecho antes y si la variable de entorno existe.
if (!admin.apps.length) {
  const serviceAccountVar = process.env.ADMIN_SERVICE_ACCOUNT;
  
  if (serviceAccountVar) {
    try {
      const serviceAccount = JSON.parse(serviceAccountVar);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "pcg-2-8bf1b.firebasestorage.app",
      });
    } catch (e: any) {
      console.error('Error al inicializar Firebase Admin SDK:', e.message);
    }
  } else {
    console.warn("ADVERTENCIA: ADMIN_SERVICE_ACCOUNT no está configurada.");
  }
}

export const adminDb = admin.firestore();
export default admin;
export const FieldValue = admin.firestore.FieldValue;
export { Timestamp };
