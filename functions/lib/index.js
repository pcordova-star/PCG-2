"use strict";
// src/functions/src/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.testGoogleAi = exports.processItemizadoJob = exports.notifyDocumentDistribution = exports.convertHeicToJpg = exports.registrarAvanceRapido = exports.createCompanyUser = void 0;
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
var processItemizadoJob_1 = require("./processItemizadoJob");
Object.defineProperty(exports, "processItemizadoJob", { enumerable: true, get: function () { return processItemizadoJob_1.processItemizadoJob; } });
var test_google_ai_1 = require("./test-google-ai");
Object.defineProperty(exports, "testGoogleAi", { enumerable: true, get: function () { return test_google_ai_1.testGoogleAi; } });
// Las funciones setSuperAdminClaim y checkUserExistsByEmail se omiten de la exportación
// para deshabilitarlas en producción, ya que solo eran necesarias para el bootstrap o
// flujos de prueba que han sido reemplazados.
//# sourceMappingURL=index.js.map