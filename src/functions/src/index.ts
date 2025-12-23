// src/functions/src/index.ts

/**
 * Este archivo es el punto de entrada para todas las Cloud Functions.
 * Cada función se importa desde su propio archivo y se exporta para que Firebase la despliegue.
 */

import { setGlobalOptions } from "firebase-functions/v2";

// Establece opciones globales para todas las funciones v2, asegurando la región
// y la cuenta de servicio con permisos para acceder a secretos.
// NO es necesario llamar a initializeApp() aquí en Gen2.
setGlobalOptions({
  region: "southamerica-west1",
  serviceAccount: "pcg-functions-sa@pcg-2-8bf1b.iam.gserviceaccount.com"
});


// Exporta todas las funciones necesarias para la operación de la plataforma.
export { createCompanyUser } from "./createCompanyUser";
export { registrarAvanceRapido } from "./registrarAvanceRapido";
export { convertHeicToJpg } from "./convertHeic";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";
export { processItemizadoJob } from "./processItemizadoJob";
export { checkUserExistsByEmail } from "./checkUserExistsByEmail";
export { testGoogleAi } from "./test-google-ai";

// La función setSuperAdminClaim se omite intencionalmente de la exportación
// para deshabilitarla en producción, ya que solo era necesaria para el bootstrap inicial.
// El archivo se conserva por si se necesita en el futuro, pero no estará desplegada.
