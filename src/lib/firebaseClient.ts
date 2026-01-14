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
  storageBucket: "pcg-2-8bf1b.firebasestorage.app", // Hardcoded to prevent derivation errors
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validation to ensure all required config values are present
for (const key in firebaseConfig) {
  if (Object.prototype.hasOwnProperty.call(firebaseConfig, key) && !firebaseConfig[key as keyof FirebaseOptions]) {
    throw new Error(`Firebase config missing. Please set NEXT_PUBLIC_FIREBASE_${key.toUpperCase()} in your environment variables.`);
  }
}

// Evita la reinicialización en el lado del cliente con HMR de Next.js
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export const firebaseDb = getFirestore(app);
export const firebaseStorage = getStorage(app);
export const firebaseFunctions = getFunctions(app, "southamerica-west1");
