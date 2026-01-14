// src/lib/firebaseClient.ts
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: "pcg-2-8bf1b.firebasestorage.app", // Hardcoded para evitar errores de derivación
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validación para asegurar que todas las variables requeridas están presentes.
// Esto lanza un error claro durante la fase de build si falta una variable.
for (const key in firebaseConfig) {
  if (Object.prototype.hasOwnProperty.call(firebaseConfig, key)) {
    const typedKey = key as keyof FirebaseOptions;
    if (!firebaseConfig[typedKey]) {
      // Este error detendrá la compilación si falta una variable, lo cual es bueno.
      throw new Error(
        `La variable de entorno Firebase '${typedKey}' no está configurada. Por favor, define NEXT_PUBLIC_FIREBASE_${key
          .replace(/([A-Z])/g, '_$1')
          .toUpperCase()} en tu entorno.`
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
