"use strict";
// src/functions/src/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.mclpDailyScheduler = exports.processItemizadoJob = exports.convertHeicToJpg = exports.checkUserExistsByEmail = exports.registrarAvanceRapido = exports.testGoogleAi = exports.setSuperAdminClaim = exports.requestModuleActivation = exports.notifyDocumentDistribution = exports.deactivateCompanyUser = exports.createCompanyUser = void 0;
/**
 * Este archivo es el punto de entrada para todas las Cloud Functions.
 * Cada función se importa desde su propio archivo y se exporta para que Firebase la despliegue.
 */
const app_1 = require("firebase-admin/app");
const v2_1 = require("firebase-functions/v2");
// Inicializa Firebase Admin SDK solo si no se ha hecho antes.
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
// Establece opciones globales para todas las funciones v2, asegurando la región
// y la cuenta de servicio con permisos para acceder a secretos.
(0, v2_1.setGlobalOptions)({
    region: "southamerica-west1",
    serviceAccount: "pcg-functions-sa@pcg-2-8bf1b.iam.gserviceaccount.com"
});
// --- Exportación de funciones ---
// Funciones v2 (callable, http, triggers)
var createCompanyUser_1 = require("./createCompanyUser");
Object.defineProperty(exports, "createCompanyUser", { enumerable: true, get: function () { return createCompanyUser_1.createCompanyUser; } });
var deactivateCompanyUser_1 = require("./deactivateCompanyUser");
Object.defineProperty(exports, "deactivateCompanyUser", { enumerable: true, get: function () { return deactivateCompanyUser_1.deactivateCompanyUser; } });
var notifyDocumentDistribution_1 = require("./notifyDocumentDistribution");
Object.defineProperty(exports, "notifyDocumentDistribution", { enumerable: true, get: function () { return notifyDocumentDistribution_1.notifyDocumentDistribution; } });
var requestModuleActivation_1 = require("./requestModuleActivation");
Object.defineProperty(exports, "requestModuleActivation", { enumerable: true, get: function () { return requestModuleActivation_1.requestModuleActivation; } });
var setSuperAdmin_1 = require("./setSuperAdmin");
Object.defineProperty(exports, "setSuperAdminClaim", { enumerable: true, get: function () { return setSuperAdmin_1.setSuperAdminClaim; } });
var test_google_ai_1 = require("./test-google-ai");
Object.defineProperty(exports, "testGoogleAi", { enumerable: true, get: function () { return test_google_ai_1.testGoogleAi; } });
var registrarAvanceRapido_1 = require("./registrarAvanceRapido");
Object.defineProperty(exports, "registrarAvanceRapido", { enumerable: true, get: function () { return registrarAvanceRapido_1.registrarAvanceRapido; } });
var checkUserExistsByEmail_1 = require("./checkUserExistsByEmail");
Object.defineProperty(exports, "checkUserExistsByEmail", { enumerable: true, get: function () { return checkUserExistsByEmail_1.checkUserExistsByEmail; } });
// Triggers
var convertHeic_1 = require("./convertHeic");
Object.defineProperty(exports, "convertHeicToJpg", { enumerable: true, get: function () { return convertHeic_1.convertHeicToJpg; } });
var processItemizadoJob_1 = require("./processItemizadoJob");
Object.defineProperty(exports, "processItemizadoJob", { enumerable: true, get: function () { return processItemizadoJob_1.processItemizadoJob; } });
// Tareas programadas
var scheduler_1 = require("./mclp/scheduler");
Object.defineProperty(exports, "mclpDailyScheduler", { enumerable: true, get: function () { return scheduler_1.mclpDailyScheduler; } });
//# sourceMappingURL=index.js.map