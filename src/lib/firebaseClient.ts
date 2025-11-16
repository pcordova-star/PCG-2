// src/lib/firebaseClient.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyA889p_w6kZ7A4s7R6c8d7e6f5g4h3i2j1k0",
  authDomain: "pcg-2-8bf1b.firebaseapp.com",
  projectId: "pcg-2-8bf1b",
  storageBucket: "pcg-2-8bf1b.appspot.com",
  messagingSenderId: "106794103353",
  appId: "1:106794103353:web:9b8f1c2d3e4f5a6b7c8d9e",
};

// Evita la reinicialización en el lado del cliente con HMR de Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const firebaseAuth = getAuth(app);
export const firebaseDb = getFirestore(app);
export const firebaseStorage = getStorage(app);
export const firebaseFunctions = getFunctions(app, "southamerica-west1");
