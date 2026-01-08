/**
 * Punto de entrada REAL para Cloud Functions.
 * SOLO exportamos funciones que realmente existen en /src
 */

export { createCompanyUser } from "./src/createCompanyUser";
export { notifyDocumentDistribution } from "./src/notifyDocumentDistribution";
export { registrarAvanceRapido } from "./src/registrarAvanceRapido";
export { requestModuleActivation } from "./src/requestModuleActivation";
export { setSuperAdminClaim } from "./src/setSuperAdmin";
export { testGoogleAi } from "./src/test-google-ai";

// Triggers
export { convertHeicToJpg } from "./src/convertHeic";
export { processItemizadoJob } from "./src/processItemizadoJob";
export { mclpDailyScheduler } from "./src/mclp/scheduler";
