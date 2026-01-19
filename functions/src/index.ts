/**
 * Archivo principal de Cloud Functions.
 * Firebase solo despliega lo que se exporta aquí.
 * NO inicializar admin aquí; usar firebaseAdmin.ts
 */

// Funciones principales
export { analizarPlano } from "./analizarPlano";
export { createCompanyUser } from "./createCompanyUser";
export { processItemizadoJob } from "./processItemizadoJob";

// Funciones adicionales
export { setCompanyClaims } from "./setCompanyClaims";
export { setSuperAdmin } from "./setSuperAdmin";
export { checkUserExistsByEmail } from "./checkUserExistsByEmail";
export { deactivateCompanyUser } from "./deactivateCompanyUser";
export { registrarAvanceRapido } from "./registrarAvanceRapido";
export { requestModuleActivation } from "./requestModuleActivation";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";
export { convertHeicToJpg } from "./convertHeic";

// Módulo MCLP
export { mclpDailyScheduler } from "./mclp/scheduler";
