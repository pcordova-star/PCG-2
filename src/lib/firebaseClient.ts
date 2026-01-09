// src/lib/firebaseClient.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAeOtU4TyB8NHf-E49kQRE1Msy3YAplw1U",
  authDomain: "pcg-2-8bf1b.firebaseapp.com",
  projectId: "pcg-2-8bf1b",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "pcg-2-8bf1b.appspot.com",
  messagingSenderId: "133669944318",
  appId: "1:133669944318:web:0f6189b924324b6f3e1eaf",
};

// Evita la reinicialización en el lado del cliente con HMR de Next.js
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export const firebaseDb = getFirestore(app);
export const firebaseStorage = getStorage(app);
export const firebaseFunctions = getFunctions(app);
