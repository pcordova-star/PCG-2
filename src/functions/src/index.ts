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

// ⚠️ CORRECCIÓN CLAVE: Centralizar la configuración para TODAS las funciones v2.
// Esto asegura que todas las funciones usen la región y la cuenta de servicio correctas.
// La cuenta de servicio 'pcg-functions-sa' DEBE tener el rol "Acceso a secretos de Secret Manager"
// en el proyecto 'pcg-ia'.
setGlobalOptions({
  region: "southamerica-west1",
  serviceAccount: "pcg-functions-sa@pcg-2-8bf1b.iam.gserviceaccount.com"
});


// Exporta las funciones callable para que estén disponibles en el backend.
// El nombre de la propiedad del objeto exportado será el nombre de la función en Firebase.
export { createCompanyUser } from "./createCompanyUser";
export { setSuperAdminClaim } from "./setSuperAdmin";
export { registrarAvanceRapido } from "./registrarAvanceRapido";
export { convertHeicToJpg } from "./convertHeic";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";
export { processItemizadoJob } from "./processItemizadoJob";
export { checkUserExistsByEmail } from "./checkUserExistsByEmail";

// Se añade la nueva función de "smoke test"
export { testGoogleAi } from "./test-google-ai";
