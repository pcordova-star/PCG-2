import admin from "firebase-admin";
import { Timestamp } from 'firebase-admin/firestore';

// Esta verificación de seguridad es crucial.
// Si la variable no está, el build fallará con un error claro aquí mismo.
if (!process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT) {
    throw new Error(
        "La variable de entorno FIREBASE_ADMIN_SERVICE_ACCOUNT no está definida."
    );
}

try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT);
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    }
} catch (e: any) {
    console.error('Error al parsear FIREBASE_ADMIN_SERVICE_ACCOUNT:', e.message);
    // Lanzar un error si el JSON es inválido para detener el build
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT no es un JSON válido.');
}

// Se exporta la instancia de Firestore para usar en las API Routes
export const adminDb = admin.firestore();

// Se exporta la instancia principal de 'admin' para que otros archivos inicialicen los servicios dentro de las funciones.
export default admin;

// Se mantienen estas que son seguras
export const FieldValue = admin.firestore.FieldValue;
export { Timestamp };
