import { getApps, initializeApp, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let adminApp: App | null = null;

export function getAdminApp(): App {
  if (adminApp) return adminApp;

  // En un entorno de Google Cloud como App Hosting, el SDK detecta
  // las credenciales automáticamente. Llamar a initializeApp() sin argumentos
  // es la forma correcta.
  if (getApps().length === 0) {
    adminApp = initializeApp();
  } else {
    adminApp = getApps()[0]!;
  }

  return adminApp;
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
