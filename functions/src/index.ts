// src/functions/src/index.ts
import { initializeApp, getApps } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";

if (getApps().length === 0) {
  initializeApp();
}

setGlobalOptions({
  region: "southamerica-west1",
  serviceAccount: "pcg-functions-sa@pcg-2-8bf1b.iam.gserviceaccount.com"
});

// Exporta las funciones v2 (y las v1 que ahora son v2/onRequest)
export { createCompanyUser } from "./createCompanyUser";
export { registrarAvanceRapido } from "./registrarAvanceRapido";
export { convertHeicToJpg } from "./convertHeic";
export { processItemizadoJob } from "./processItemizadoJob";
export { deactivateCompanyUser } from "./deactivateCompanyUser"; // Nueva función

// Se mantienen las funciones v1 que no han sido migradas
export { setSuperAdminClaim } from "./setSuperAdmin";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";
export { checkUserExistsByEmail } from "./checkUserExistsByEmail";
export { testGoogleAi } from "./test-google-ai";
