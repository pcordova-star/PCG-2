// src/functions/src/index.ts

import * as admin from "firebase-admin";
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// --- Exportación de funciones v1 ---
export { createCompanyUser } from "./createCompanyUser";
export { registrarAvanceRapido } from "./registrarAvanceRapido";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";
export { setSuperAdminClaim } from "./setSuperAdmin";
export { checkUserExistsByEmail } from "./checkUserExistsByEmail";
export { testGoogleAi } from "./test-google-ai";
export { deactivateCompanyUser } from "./deactivateCompanyUser";
export { requestModuleActivation } from "./requestModuleActivation";
export { convertHeicToJpg } from "./convertHeic";
export { processItemizadoJob } from "./processItemizadoJob";
export { mclpDailyScheduler } from "./mclp/scheduler";
