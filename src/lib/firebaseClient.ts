// src/lib/firebaseClient.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "pcg-2-8bf1b.firebaseapp.com",
  projectId: "pcg-2-8bf1b",
  storageBucket: "pcg-2-8bf1b.appspot.com",
  messagingSenderId: "365621445432",
  appId: "1:365621445432:web:ce337833f2c501535a2c26",
};

function createFirebaseApp() {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

const app = createFirebaseApp();

export const firebaseAuth = getAuth(app);
export const firebaseDb = getFirestore(app);
export const firebaseStorage = getStorage(app);
export const firebaseFunctions = getFunctions(app, "southamerica-west1");
