"use strict";
// src/functions/src/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyDocumentDistribution = exports.convertHeicToJpg = exports.registrarAvanceRapido = exports.createCompanyUser = void 0;
/**
 * Este archivo es el punto de entrada para todas las Cloud Functions.
 * Cada función se importa desde su propio archivo y se exporta para que Firebase la despliegue.
 */
const v2_1 = require("firebase-functions/v2");
// Establece opciones globales para todas las funciones v2, asegurando la región
// y la cuenta de servicio con permisos para acceder a secretos.
// NO es necesario llamar a initializeApp() aquí en Gen2.
(0, v2_1.setGlobalOptions)({
    region: "southamerica-west1",
    serviceAccount: "pcg-functions-sa@pcg-2-8bf1b.iam.gserviceaccount.com"
});
// Exporta todas las funciones necesarias para la operación de la plataforma.
var createCompanyUser_1 = require("./createCompanyUser");
Object.defineProperty(exports, "createCompanyUser", { enumerable: true, get: function () { return createCompanyUser_1.createCompanyUser; } });
var registrarAvanceRapido_1 = require("./registrarAvanceRapido");
Object.defineProperty(exports, "registrarAvanceRapido", { enumerable: true, get: function () { return registrarAvanceRapido_1.registrarAvanceRapido; } });
var convertHeic_1 = require("./convertHeic");
Object.defineProperty(exports, "convertHeicToJpg", { enumerable: true, get: function () { return convertHeic_1.convertHeicToJpg; } });
var notifyDocumentDistribution_1 = require("./notifyDocumentDistribution");
Object.defineProperty(exports, "notifyDocumentDistribution", { enumerable: true, get: function () { return notifyDocumentDistribution_1.notifyDocumentDistribution; } });
// Se comentan temporalmente las funciones que dependen de la API de IA para evitar errores de deploy.
// export { processItemizadoJob } from "./processItemizadoJob";
// export { checkUserExistsByEmail } from "./checkUserExistsByEmail";
// export { testGoogleAi } from "./test-google-ai";
// La función setSuperAdminClaim se omite intencionalmente de la exportación
// para deshabilitarla en producción, ya que solo era necesaria para el bootstrap inicial.
// El archivo se conserva por si se necesita en el futuro, pero no estará desplegada.
//# sourceMappingURL=index.js.map