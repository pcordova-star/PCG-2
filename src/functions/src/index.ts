// src/functions/src/index.ts

import * as admin from "firebase-admin";
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// --- Exportación de funciones ---
export * from "./createCompanyUser";
export * from "./registrarAvanceRapido";
export * from "./notifyDocumentDistribution";
export * from "./setSuperAdmin";
export * from "./checkUserExistsByEmail";
export * from "./test-google-ai";
export * from "./deactivateCompanyUser";
export * from "./requestModuleActivation";
export * from "./convertHeic";
export * from "./processItemizadoJob";
export * from "./mclp/scheduler";
