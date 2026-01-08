// functions/gen2/src/index.ts
/**
 * Este archivo es el punto de entrada para todas las Cloud Functions de Gen2.
 */

// --- Funciones HTTP (Gen2 onRequest) ---
export { deactivateCompanyUser } from "./deactivateCompanyUser";
export { requestModuleActivation } from "./requestModuleActivation";

// --- Triggers de eventos (Gen2) ---
export { convertHeicToJpg } from './convertHeic';
// export { processItemizadoJob } from './processItemizadoJob';
