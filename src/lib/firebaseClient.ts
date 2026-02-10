// src/app/lib/firebaseClient.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
   apiKey: "AIzaSyBfMp_dH9XhFSXEeMxY-Cdy8MDRIgWrxR0", 
  
  // El resto ya lo he rellenado con tus datos correctos:
  authDomain: "pcg-2-8bf1b.firebaseapp.com",
  projectId: "pcg-2-8bf1b",
  storageBucket: "pcg-2-8bf1b.appspot.com",
  messagingSenderId: "1073834543546",
  appId: "1:1073834543546:web:2f85a4a8358280f8589737"
};

// Initialize Firebase for SSR
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const firebaseAuth = getAuth(app);
const firebaseDb = getFirestore(app);
const firebaseStorage = getStorage(app);
const firebaseFunctions = getFunctions(app, "us-central1"); // O la región que corresponda

export { app as firebaseApp, firebaseAuth, firebaseDb, firebaseStorage, firebaseFunctions };
