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


// Exporta solo la función necesaria para el bootstrap del superadmin
export { setSuperAdminClaim } from "./setSuperAdmin";

// --- TEMPORALMENTE DESHABILITADAS PARA DEPURACIÓN ---
// export { createCompanyUser } from "./createCompanyUser";
// export { registrarAvanceRapido } from "./registrarAvanceRapido";
// export { convertHeicToJpg } from "./convertHeic";
// export { notifyDocumentDistribution } from "./notifyDocumentDistribution";
// export { processItemizadoJob } from "./processItemizadoJob";
// export { checkUserExistsByEmail } from "./checkUserExistsByEmail";
// export { testGoogleAi } from "./test-google-ai";
