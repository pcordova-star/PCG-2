
// src/functions/src/index.ts

/**
 * Este archivo es el punto de entrada para todas las Cloud Functions.
 * La reestructuración aísla las exportaciones de v1 y v2 para asegurar el despliegue correcto de cada tipo de función.
 */

import * as admin from 'firebase-admin';

// Inicializa Firebase Admin SDK solo si no se ha hecho antes.
if (!admin.apps.length) {
  admin.initializeApp();
}

// --- FUNCIONES V1 ---
// Todas las funciones callable (onCall) y onRequest se exportan aquí como v1.
export { createCompanyUser } from "./createCompanyUser";
export { setSuperAdminClaim } from "./setSuperAdmin";
export { registrarAvanceRapido } from "./registrarAvanceRapido";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";
export { checkUserExistsByEmail } from "./checkUserExistsByEmail";
export { testGoogleAi } from "./test-google-ai";

// --- FUNCIONES V2 ---
// Los triggers de Firestore y Storage (onDocumentCreated, onObjectFinalized) se exportan por separado como v2.
export { convertHeicToJpg } from './convertHeic';
export { processItemizadoJob } from './processItemizadoJob';
