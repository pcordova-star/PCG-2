// functions/src/index.ts
// Entry point de Cloud Functions.
// Firebase solo registrará las funciones que exportes aquí.

import { initializeApp, getApps } from "firebase-admin/app";

// Inicializar Firebase Admin SOLO si no está inicializado.
if (!getApps().length) {
  initializeApp();
}

// Exportar funciones
export { registrarAvanceRapido } from "./registrarAvanceRapido";
