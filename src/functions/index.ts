/**
 * This file is the entry point for all Cloud Functions.
 * Each function is imported from its own file and exported for Firebase to deploy.
 */

// Initialize Firebase Admin SDK only once.
import * as admin from "firebase-admin";
admin.initializeApp();


// Export all functions from their individual files.
// v1 HTTP and Callable Functions
export { createCompanyUser } from "./src/createCompanyUser";
export { registrarAvanceRapido } from "./src/registrarAvanceRapido";
export { notifyDocumentDistribution } from "./src/notifyDocumentDistribution";
export { setSuperAdminClaim } from "./src/setSuperAdmin";
export { checkUserExistsByEmail } from "./src/checkUserExistsByEmail";
export { testGoogleAi } from "./src/test-google-ai";

// v2 HTTP onRequest and Event-driven Functions
export { deactivateCompanyUser } from "./src/deactivateCompanyUser";
export { requestModuleActivation } from "./src/requestModuleActivation";
export { convertHeicToJpg } from "./src/convertHeic";
export { processItemizadoJob } from "./src/processItemizadoJob";

// Scheduled functions (must be v1 for specified regions)
export { mclpDailyScheduler } from "./src/mclp/scheduler";
