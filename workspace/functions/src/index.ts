// src/functions/src/index.ts

/**
 * Este archivo es el punto de entrada para todas las Cloud Functions.
 * Cada función se importa desde su propio archivo y se exporta para que Firebase la despliegue.
 */

import { initializeApp, getApps } from "firebase-admin/app";
// import { next } from '@genkit-ai/next';

// Inicializa Firebase Admin SDK solo si no se ha hecho antes.
if (getApps().length === 0) {
  initializeApp();
}

// export { next };

// Exporta las funciones callable para que estén disponibles en el backend.
// El nombre de la propiedad del objeto exportado será el nombre de la función en Firebase.
export { createCompanyUser } from "./createCompanyUser";
export { setSuperAdminClaim } from "./setSuperAdmin";
export { registrarAvanceRapido } from "./registrarAvanceRapido";
export { convertHeicToJpg } from "./convertHeic";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";
export { processItemizadoJob } from "./processItemizadoJob";
// export { getSecureDownloadUrl } from "./secureDownload";
