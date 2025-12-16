import admin from "firebase-admin";
import { App, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App;

function initializeAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  // En un entorno de Google Cloud como App Hosting, el SDK detecta
  // las credenciales automáticamente.
  if (process.env.GOOGLE_CLOUD_PROJECT) {
     adminApp = initializeApp();
     return adminApp;
  }
  
  // Para Vercel y otros entornos, usamos la variable de entorno con el JSON de la cuenta de servicio.
  const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error(
      "La variable de entorno FIREBASE_ADMIN_SERVICE_ACCOUNT no está configurada. " +
      "Por favor, añada el contenido del JSON de la cuenta de servicio a esta variable."
    );
  }

  const serviceAccount = JSON.parse(serviceAccountJson);

  adminApp = initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.GOOGLE_CLOUD_PROJECT || serviceAccount.project_id,
  });
  
  return adminApp;
}

export function getAdminApp(): App {
  if (!adminApp) {
    adminApp = initializeAdminApp();
  }
  return adminApp;
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
