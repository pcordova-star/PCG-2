// src/functions/src/index.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Inicializa Firebase Admin SDK solo si no se ha hecho antes.
if (!admin.apps.length) {
  admin.initializeApp();
}

// Exporta las funciones v1
export { createCompanyUser } from "./createCompanyUser";
export { setSuperAdminClaim } from "./setSuperAdmin";
export { registrarAvanceRapido } from "./registrarAvanceRapido";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";
export { checkUserExistsByEmail } from "./checkUserExistsByEmail";
export { testGoogleAi } from "./test-google-ai";

// Exporta las funciones v2 (storage y firestore triggers) por separado
export { convertHeicToJpg } from './convertHeic';
export { processItemizadoJob } from './processItemizadoJob';
