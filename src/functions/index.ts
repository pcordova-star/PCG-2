/**
 * Punto de entrada REAL para Cloud Functions.
 * SOLO exportamos funciones que realmente existen en /src
 */

// --- HTTP & Callable Functions ---
export { createCompanyUser } from "./src/createCompanyUser";
export { registrarAvanceRapido } from "./src/registrarAvanceRapido";
export { notifyDocumentDistribution } from "./src/notifyDocumentDistribution";
export { setSuperAdminClaim } from "./src/setSuperAdmin";
export { testGoogleAi } from "./src/test-google-ai";
export { requestModuleActivation } from "./src/requestModuleActivation";

// --- Storage Triggers ---
export { convertHeicToJpg } from "./src/convertHeic";

// --- Firestore Triggers ---
export { processItemizadoJob } from "./src/processItemizadoJob";

// --- Módulo MCLP ---
export { mclpDailyScheduler } from "./src/mclp/scheduler";
