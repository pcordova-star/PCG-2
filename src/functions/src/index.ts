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

// Establece opciones globales para todas las funciones v2, asegurando la región.
// Se elimina la cuenta de servicio explícita para usar la default de App Engine.
setGlobalOptions({
  region: "southamerica-west1",
});


// Exporta las funciones callable para que estén disponibles en el backend.
// El nombre de la propiedad del objeto exportado será el nombre de la función en Firebase.
export { createCompanyUser } from "./createCompanyUser";
export { setSuperAdminClaim } from "./setSuperAdmin";
export { registrarAvanceRapido } from "./registrarAvanceRapido";
export { convertHeicToJpg } from "./convertHeic";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";

// Se comentan temporalmente las funciones que dependen de la API de IA para evitar errores de deploy.
// export { processItemizadoJob } from "./processItemizadoJob";
// export { checkUserExistsByEmail } from "./checkUserExistsByEmail";
// export { testGoogleAi } from "./test-google-ai";

// La siguiente línea está comentada porque el archivo de origen fue eliminado.
// export { getSecureDownloadUrl } from "./secureDownload";
