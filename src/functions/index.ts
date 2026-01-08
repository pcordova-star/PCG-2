// src/functions/src/index.ts

/**
 * Punto de entrada de Cloud Functions.
 * Solo exportamos las funciones que realmente existen en src/.
 */

// --- Funciones HTTP existentes ---
export { requestModuleActivation } from "./requestModuleActivation";
export { createCompanyUser } from "./createCompanyUser";

// --- Módulo Cumplimiento Legal ---
export { mclpDailyScheduler } from "./mclp/scheduler";
