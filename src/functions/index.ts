/**
 * Punto de entrada REAL de Cloud Functions.
 * Exportamos solo funciones que existen realmente en src/
 */

// --- HTTP & Callable Functions ---
export { createCompanyUser } from "./src/createCompanyUser";
export { registrarAvanceRapido } from "./src/registrarAvanceRapido";
export { notifyDocumentDistribution } from "./src/notifyDocumentDistribution";
export { deactivateCompanyUser } from "./src/deactivateCompanyUser";
export { setSuperAdminClaim } from "./src/setSuperAdmin";
export { testGoogleAi } from "./src/test-google-ai";
export { requestModuleActivation } from "./src/requestModuleActivation";

// --- Storage Triggers ---
export { convertHeicToJpg } from "./src/convertHeic";

// --- Firestore Triggers ---
export { processItemizadoJob } from "./src/processItemizadoJob";

// --- Módulo MCLP ---
export { mclpDailyScheduler } from "./src/mclp/scheduler";