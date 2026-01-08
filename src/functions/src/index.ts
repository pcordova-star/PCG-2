/**
 * Punto de entrada REAL de Cloud Functions.
 * Solo exportamos funciones que existen en este directorio.
 */

// --- Funciones HTTP ---
export { createCompanyUser } from "./createCompanyUser";
export { registrarAvanceRapido } from "./registrarAvanceRapido";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";
export { deactivateCompanyUser } from "./deactivateCompanyUser";
export { setSuperAdminClaim } from "./setSuperAdmin";
export { testGoogleAi } from "./test-google-ai";
export { requestModuleActivation } from "./requestModuleActivation";


// --- Triggers ---
export { convertHeicToJpg } from "./convertHeic";
export { processItemizadoJob } from "./processItemizadoJob";


// --- MCLP ---
export { mclpDailyScheduler } from "./mclp/scheduler";
