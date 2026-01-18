// src/functions/src/index.ts
import * as admin from "firebase-admin";
admin.initializeApp();

// --- Funciones principales ---
export { createCompanyUser } from "./createCompanyUser";
export { analizarPlano } from "./analizarPlano";

// --- Funciones auxiliares ---
export { checkUserExistsByEmail } from "./checkUserExistsByEmail";
export { deactivateCompanyUser } from "./deactivateCompanyUser";
export { registrarAvanceRapido } from "./registrarAvanceRapido";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";
export { requestModuleActivation } from "./requestModuleActivation";
export { setCompanyClaims } from "./setCompanyClaims";
export { setSuperAdminClaim } from "./setSuperAdmin";
export { testGoogleAi } from "./test-google-ai";

// --- Triggers ---
export { convertHeicToJpg } from "./convertHeic";
export { processItemizadoJob } from "./processItemizadoJob";

// --- Scheduler ---
export { mclpDailyScheduler } from "./mclp/scheduler";
