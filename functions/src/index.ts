// src/functions/src/index.ts
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Este archivo es el punto de entrada para todas las Cloud Functions.
 * Cada función se importa desde su propio archivo y se exporta para que Firebase la despliegue.
 */

// --- Exportación de funciones v1 ---
export { createCompanyUser } from "./createCompanyUser";
export { checkUserExistsByEmail } from "./checkUserExistsByEmail";
export { setSuperAdminClaim } from "./setSuperAdmin";
export { setCompanyClaims } from "./setCompanyClaims";
export { deactivateCompanyUser } from "./deactivateCompanyUser";
export { registrarAvanceRapido } from "./registrarAvanceRapido";
export { requestModuleActivation } from "./requestModuleActivation";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";

// --- Triggers (Storage, Firestore) v1 ---
export { convertHeicToJpg } from "./convertHeic";
export { processItemizadoJob } from "./processItemizadoJob";

// --- Funciones de IA ---
export { analizarPlano } from "./analizarPlano";
export { testGoogleAi } from "./test-google-ai";

// --- Funciones Programadas (Scheduler) v1 ---
export { mclpDailyScheduler } from "./mclp/scheduler";
