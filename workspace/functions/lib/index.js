"use strict";
// workspace/functions/src/index.ts
/**
 * Punto de entrada UNIFICADO de Cloud Functions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mclpDailyScheduler = exports.notifyDocumentDistribution = exports.requestModuleActivation = exports.registrarAvanceRapido = exports.deactivateCompanyUser = exports.checkUserExistsByEmail = exports.setSuperAdminClaim = exports.setCompanyClaims = exports.processComparacionJob = exports.processItemizadoJob = exports.analizarPlano = exports.createCompanyUser = void 0;
// --- HTTP ---
var createCompanyUser_1 = require("./createCompanyUser");
Object.defineProperty(exports, "createCompanyUser", { enumerable: true, get: function () { return createCompanyUser_1.createCompanyUser; } });
var analizarPlano_1 = require("./analizarPlano");
Object.defineProperty(exports, "analizarPlano", { enumerable: true, get: function () { return analizarPlano_1.analizarPlano; } });
var processItemizadoJob_1 = require("./processItemizadoJob");
Object.defineProperty(exports, "processItemizadoJob", { enumerable: true, get: function () { return processItemizadoJob_1.processItemizadoJob; } });
var processComparacionJob_1 = require("./processComparacionJob"); // <--- AÑADIDO
Object.defineProperty(exports, "processComparacionJob", { enumerable: true, get: function () { return processComparacionJob_1.processComparacionJob; } });
// --- Funciones de autenticación / claims ---
var setCompanyClaims_1 = require("./setCompanyClaims");
Object.defineProperty(exports, "setCompanyClaims", { enumerable: true, get: function () { return setCompanyClaims_1.setCompanyClaims; } });
var setSuperAdmin_1 = require("./setSuperAdmin");
Object.defineProperty(exports, "setSuperAdminClaim", { enumerable: true, get: function () { return setSuperAdmin_1.setSuperAdminClaim; } });
var checkUserExistsByEmail_1 = require("./checkUserExistsByEmail");
Object.defineProperty(exports, "checkUserExistsByEmail", { enumerable: true, get: function () { return checkUserExistsByEmail_1.checkUserExistsByEmail; } });
var deactivateCompanyUser_1 = require("./deactivateCompanyUser");
Object.defineProperty(exports, "deactivateCompanyUser", { enumerable: true, get: function () { return deactivateCompanyUser_1.deactivateCompanyUser; } });
// --- Funciones operacionales ---
var registrarAvanceRapido_1 = require("./registrarAvanceRapido");
Object.defineProperty(exports, "registrarAvanceRapido", { enumerable: true, get: function () { return registrarAvanceRapido_1.registrarAvanceRapido; } });
var requestModuleActivation_1 = require("./requestModuleActivation");
Object.defineProperty(exports, "requestModuleActivation", { enumerable: true, get: function () { return requestModuleActivation_1.requestModuleActivation; } });
var notifyDocumentDistribution_1 = require("./notifyDocumentDistribution");
Object.defineProperty(exports, "notifyDocumentDistribution", { enumerable: true, get: function () { return notifyDocumentDistribution_1.notifyDocumentDistribution; } });
// --- Triggers ---
// export { convertHeicToJpg } from "./convertHeic"; // Eliminado para ahorrar espacio
// --- Scheduler (cron) ---
var scheduler_1 = require("./mclp/scheduler");
Object.defineProperty(exports, "mclpDailyScheduler", { enumerable: true, get: function () { return scheduler_1.mclpDailyScheduler; } });
// --- Helpers / Configs ---
// NOTA: Generalmente no se exportan helpers, pero se hace si es necesario para tests o dependencias.
//# sourceMappingURL=index.js.map