
// src/functions/src/index.ts

/**
 * Este archivo es el punto de entrada para todas las Cloud Functions.
 * Cada función se importa desde su propio archivo y se exporta para que Firebase la despliegue.
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";

// Inicializa Firebase Admin SDK solo si no se ha hecho antes.
if (getApps().length === 0) {
  initializeApp();
}

// Establece opciones globales para todas las funciones v2, asegurando la región
// y la cuenta de servicio con permisos para acceder a secretos.
setGlobalOptions({
  region: "southamerica-west1",
  serviceAccount: "pcg-functions-sa@pcg-2-8bf1b.iam.gserviceaccount.com"
});

// --- Exportación de funciones ---

// Funciones v1 (callable y http)
export { createCompanyUser } from "./createCompanyUser";
export { registrarAvanceRapido } from "./registrarAvanceRapido";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";
export { deactivateCompanyUser } from "./deactivateCompanyUser";
export { setSuperAdminClaim } from "./setSuperAdmin";
export { requestModuleActivation } from "./requestModuleActivation"; // NUEVA FUNCIÓN
// export { checkUserExistsByEmail } from "./checkUserExistsByEmail";
export { testGoogleAi } from "./test-google-ai";

// Funciones v2 (triggers de evento)
export { convertHeicToJpg } from './convertHeic';
export { processItemizadoJob } from './processItemizadoJob';
