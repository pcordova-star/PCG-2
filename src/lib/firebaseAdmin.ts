// src/lib/firebaseAdmin.ts
import { getApp, getApps, initializeApp } from "firebase-admin/app";

let adminApp;

export function getAdminApp() {
  if (!getApps().length) {
    // En App Hosting / Studio, initializeApp() sin argumentos
    // usa automáticamente la cuenta de servicio del proyecto.
    adminApp = initializeApp();
  } else {
    adminApp = getApp();
  }
  return adminApp;
}
