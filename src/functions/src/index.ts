// src/functions/src/index.ts

/**
 * Este archivo es el punto de entrada para todas las Cloud Functions.
 * Cada función se importa desde su propio archivo y se exporta para que Firebase la despliegue.
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Inicializa Firebase Admin SDK solo si no se ha hecho antes.
if (!admin.apps.length) {
  admin.initializeApp();
}

// Establece la región global para todas las funciones v1
const region = "southamerica-west1";

// Exporta las funciones callable y onRequest para que estén disponibles en el backend.

// Funciones v2 (onCall)
export { createCompanyUser } from "./createCompanyUser";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";

// Funciones v1 (convertidas para estabilidad)
import { registrarAvanceRapido as registrarAvanceRapidoV1 } from './registrarAvanceRapido';
export const registrarAvanceRapido = registrarAvanceRapidoV1;


// Funciones v2 (Storage & Firestore Triggers)
export { convertHeicToJpg } from "./convertHeic";
export { processItemizadoJob } from "./processItemizadoJob";
export { testGoogleAi } from "./test-google-ai";
export { setSuperAdminClaim } from "./setSuperAdmin";
export { checkUserExistsByEmail } from './checkUserExistsByEmail';
