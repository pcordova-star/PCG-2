// src/functions/src/index.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Inicializa Firebase Admin SDK solo si no se ha hecho antes.
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// --- Exportación de funciones ---

// Funciones v1 (callable y http)
export { createCompanyUser } from "./createCompanyUser";
export { registrarAvanceRapido } from "./registrarAvanceRapido";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";
export { setSuperAdminClaim } from "./setSuperAdmin";
export { checkUserExistsByEmail } from "./checkUserExistsByEmail";
export { testGoogleAi } from "./test-google-ai";

// Funciones v2
export { deactivateCompanyUser } from "./deactivateCompanyUser";
export { requestModuleActivation } from "./requestModuleActivation";
export { convertHeicToJpg } from "./convertHeic";
export { processItemizadoJob } from "./processItemizadoJob";

// Tarea programada (v1 para especificar región no estándar para pubsub)
export const mclpDailyScheduler = functions
  .region("us-central1") // Región compatible con Cloud Scheduler
  .pubsub.schedule("every day 01:00")
  .timeZone("UTC")
  .onRun(async (context) => {
    const { mclpDailyScheduler: scheduler } = await import("./mclp/scheduler");
    return scheduler(context);
  });
