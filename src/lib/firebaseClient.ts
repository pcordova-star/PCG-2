// src/lib/firebaseClient.ts
import { initializeApp, getApps, getApp, FirebaseApp, FirebaseOptions } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFunctions, Functions } from "firebase/functions";

// Definimos la estructura esperada de las variables de entorno
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let firebaseAuth: Auth;
let firebaseDb: Firestore;
let firebaseStorage: FirebaseStorage;
let firebaseFunctions: Functions;

// Solo inicializar en el cliente (entorno del navegador)
if (typeof window !== 'undefined') {
  
  // Validar que todas las variables de entorno requeridas están presentes en el cliente.
  for (const key in firebaseConfig) {
    if (Object.prototype.hasOwnProperty.call(firebaseConfig, key)) {
      const typedKey = key as keyof FirebaseOptions;
      if (!firebaseConfig[typedKey]) {
        // Formatear el nombre de la variable para el mensaje de error
        const envVarKey = key.replace(/([A-Z])/g, '_$1').toUpperCase();
        const fullEnvVarName = `NEXT_PUBLIC_FIREBASE_${envVarKey}`;
        
        throw new Error(
          `Error de configuración del cliente: La variable de entorno Firebase '${fullEnvVarName}' no está definida o está vacía. ` +
          `Asegúrate de que esté configurada en tu archivo .env.local o en las variables de entorno de producción.`
        );
      }
    }
  }

  // Evita la reinicialización en el lado del cliente con HMR de Next.js
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  firebaseAuth = getAuth(app);
  firebaseDb = getFirestore(app);
  firebaseStorage = getStorage(app);
  firebaseFunctions = getFunctions(app, "us-central1");
}

// Exporta las instancias que serán undefined en el servidor pero estarán disponibles en el cliente.
export { firebaseAuth, firebaseDb, firebaseStorage, firebaseFunctions };
