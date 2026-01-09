// src/functions/index.ts

/**
 * Este archivo es el punto de entrada para todas las Cloud Functions.
 * Cada función se importa desde su propio archivo y se exporta para que Firebase la despliegue.
 */

// Se elimina la inicialización global de admin.initializeApp() para evitar timeouts en el deploy.
// Cada función se encargará de su propia inicialización si es necesario.

// --- Exportación de funciones v1 ---
export { createCompanyUser } from "./src/createCompanyUser";
export { registrarAvanceRapido } from "./src/registrarAvanceRapido";
export { notifyDocumentDistribution } from "./src/notifyDocumentDistribution";
export { setSuperAdminClaim } from "./src/setSuperAdmin";
export { checkUserExistsByEmail } from "./src/checkUserExistsByEmail";
export { testGoogleAi } from "./src/test-google-ai";
export { deactivateCompanyUser } from "./src/deactivateCompanyUser";
export { requestModuleActivation } from "./src/requestModuleActivation";
export { convertHeicToJpg } from "./src/convertHeic";
export { processItemizadoJob } from "./src/processItemizadoJob";
export { mclpDailyScheduler } from "./src/mclp/scheduler";
