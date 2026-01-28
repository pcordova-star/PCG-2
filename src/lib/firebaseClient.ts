// src/lib/firebaseClient.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
// This is NOT sensitive data and can be exposed on the client.
const firebaseConfig: FirebaseOptions = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN_HERE",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "pcg-2-8bf1b.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE",
};

// Initialize Firebase for SSR
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const firebaseAuth = getAuth(app);
const firebaseDb = getFirestore(app);
const firebaseStorage = getStorage(app);
const firebaseFunctions = getFunctions(app, "us-central1"); // O la región que corresponda

export { app as firebaseApp, firebaseAuth, firebaseDb, firebaseStorage, firebaseFunctions };
