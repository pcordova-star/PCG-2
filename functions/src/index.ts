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
export { testGoogleAi } from "./test-google-ai";

// Las funciones setSuperAdminClaim y checkUserExistsByEmail se omiten de la exportación
// para deshabilitarlas en producción, ya que solo eran necesarias para el bootstrap o
// flujos de prueba que han sido reemplazados.

