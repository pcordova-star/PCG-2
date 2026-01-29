// workspace/functions/src/index.ts
/**
 * Punto de entrada UNIFICADO de Cloud Functions.
 */

// --- HTTP ---
export { createCompanyUser } from "./createCompanyUser";
export { analizarPlano } from "./analizarPlano";
export { processItemizadoJob } from "./processItemizadoJob";
export { processComparacionJob } from "./processComparacionJob"; // <--- AÑADIDO

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
// export { convertHeicToJpg } from "./convertHeic"; // Eliminado para ahorrar espacio

// --- Scheduler (cron) ---
export { mclpDailyScheduler } from "./mclp/scheduler";

// --- Helpers / Configs ---
// NOTA: Generalmente no se exportan helpers, pero se hace si es necesario para tests o dependencias.
