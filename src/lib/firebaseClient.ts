// src/lib/firebaseClient.ts
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Definimos la estructura esperada de las variables de entorno
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "pcg-2-8bf1b.firebasestorage.app", // Fallback por seguridad
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Bucle de validación para asegurar que todas las variables requeridas están presentes.
// Esto lanza un error claro durante la fase de build si falta una variable.
for (const key in firebaseConfig) {
  if (Object.prototype.hasOwnProperty.call(firebaseConfig, key)) {
    const typedKey = key as keyof FirebaseOptions;
    if (!firebaseConfig[typedKey]) {
      // Convertir camelCase (apiKey) a SCREAMING_SNAKE_CASE (API_KEY)
      const envVarKey = typedKey.replace(/([A-Z])/g, '_$1').toUpperCase();
      const fullEnvVarName = `NEXT_PUBLIC_FIREBASE_${envVarKey}`;
      
      // Este error detendrá la compilación si falta una variable, lo cual es bueno.
      throw new Error(
        `Error de configuración: La variable de entorno Firebase '${fullEnvVarName}' no está definida o está vacía. ` +
        `Por favor, defínala en su archivo .env o en la configuración de su entorno de producción.`
      );
    }
  }
}

// Evita la reinicialización en el lado del cliente con HMR de Next.js
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export const firebaseDb = getFirestore(app);
export const firebaseStorage = getStorage(app);
export const firebaseFunctions = getFunctions(app, "southamerica-west1");
