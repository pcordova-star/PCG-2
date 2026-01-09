// src/functions/src/index.ts

/**
 * Este archivo es el punto de entrada para todas las Cloud Functions.
 * Cada función se importa desde su propio archivo y se exporta para que Firebase la despliegue.
 */

// --- Funciones v1 (onCall, onRequest) ---
export { createCompanyUser } from "./createCompanyUser";
export { registrarAvanceRapido } from "./registrarAvanceRapido";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";
export { setSuperAdminClaim } from "./setSuperAdmin";
export { checkUserExistsByEmail } from "./checkUserExistsByEmail";
export { testGoogleAi } from "./test-google-ai";
export { deactivateCompanyUser } from "./deactivateCompanyUser";
export { requestModuleActivation } from "./requestModuleActivation";

// --- Triggers (Storage, Firestore) ---
export { convertHeicToJpg } from "./convertHeic";
export { processItemizadoJob } from "./processItemizadoJob";

// --- Funciones Programadas (Scheduler) ---
export { mclpDailyScheduler } from "./mclp/scheduler";
