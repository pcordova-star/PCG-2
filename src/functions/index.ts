/**
 * Punto de entrada REAL de Cloud Functions.
 * Exportamos solo funciones que existen en la carpeta src/
 */

export { createCompanyUser } from "./src/createCompanyUser";
export { mclpDailyScheduler } from "./src/mclp/scheduler";
export { requestModuleActivation } from "./src/requestModuleActivation";
