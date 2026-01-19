// workspace/functions/src/index.ts
/**
 * Punto de entrada UNIFICADO de Cloud Functions.
 */

// --- Funciones principales ---
export { createCompanyUser } from "./createCompanyUser";
export { analizarPlano } from "./analizarPlano";
export { processItemizadoJob } from "./processItemizadoJob";

// --- Funciones de autenticación / claims ---
export { setCompanyClaims } from "./setCompanyClaims";
export { setSuperAdminClaim } from "./setSuperAdmin";
export { checkUserExistsByEmail } from "./checkUserExistsByEmail";
export { deactivateCompanyUser } from "./deactivateCompanyUser";

// --- Funciones operacionales ---
export { registrarAvanceRapido } from "./registrarAvanceRapido";
export { requestModuleActivation } from "./requestModuleActivation";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";

// --- Triggers ---
export { convertHeicToJpg } from "./convertHeic";

// --- Scheduler (cron) ---
export { mclpDailyScheduler } from "./mclp/scheduler";
