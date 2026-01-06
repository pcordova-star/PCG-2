// src/functions/src/index.ts

/**
 * Este archivo es el punto de entrada para todas las Cloud Functions.
 * Cada función se importa desde su propio archivo y se exporta para que Firebase la despliegue.
 * NO debe haber inicialización de SDKs (ej: initializeApp) en este archivo.
 */

// --- Funciones HTTP (Gen 1 y Gen 2 onCall/onRequest) ---
// export { createCompanyUser } from "./createCompanyUser";
// export { registrarAvanceRapido } from "./registrarAvanceRapido";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";
export { deactivateCompanyUser } from "./deactivateCompanyUser";
export { setSuperAdminClaim } from "./setSuperAdmin";
export { testGoogleAi } from "./test-google-ai";

// --- Triggers de eventos (Gen 2) ---
export { convertHeicToJpg } from './convertHeic';
export { processItemizadoJob } from './processItemizadoJob';
