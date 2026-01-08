"use strict";
/**
 * Entry de Cloud Functions (único y correcto).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mclpDailyScheduler = exports.requestModuleActivation = exports.processItemizadoJob = exports.convertHeicToJpg = exports.testGoogleAi = exports.setSuperAdminClaim = exports.registrarAvanceRapido = exports.deactivateCompanyUser = exports.notifyDocumentDistribution = exports.createCompanyUser = void 0;
var createCompanyUser_1 = require("./src/createCompanyUser");
Object.defineProperty(exports, "createCompanyUser", { enumerable: true, get: function () { return createCompanyUser_1.createCompanyUser; } });
var notifyDocumentDistribution_1 = require("./src/notifyDocumentDistribution");
Object.defineProperty(exports, "notifyDocumentDistribution", { enumerable: true, get: function () { return notifyDocumentDistribution_1.notifyDocumentDistribution; } });
var deactivateCompanyUser_1 = require("./src/deactivateCompanyUser");
Object.defineProperty(exports, "deactivateCompanyUser", { enumerable: true, get: function () { return deactivateCompanyUser_1.deactivateCompanyUser; } });
var registrarAvanceRapido_1 = require("./src/registrarAvanceRapido");
Object.defineProperty(exports, "registrarAvanceRapido", { enumerable: true, get: function () { return registrarAvanceRapido_1.registrarAvanceRapido; } });
var setSuperAdmin_1 = require("./src/setSuperAdmin");
Object.defineProperty(exports, "setSuperAdminClaim", { enumerable: true, get: function () { return setSuperAdmin_1.setSuperAdminClaim; } });
var test_google_ai_1 = require("./src/test-google-ai");
Object.defineProperty(exports, "testGoogleAi", { enumerable: true, get: function () { return test_google_ai_1.testGoogleAi; } });
var convertHeic_1 = require("./src/convertHeic");
Object.defineProperty(exports, "convertHeicToJpg", { enumerable: true, get: function () { return convertHeic_1.convertHeicToJpg; } });
var processItemizadoJob_1 = require("./src/processItemizadoJob");
Object.defineProperty(exports, "processItemizadoJob", { enumerable: true, get: function () { return processItemizadoJob_1.processItemizadoJob; } });
var requestModuleActivation_1 = require("./src/requestModuleActivation");
Object.defineProperty(exports, "requestModuleActivation", { enumerable: true, get: function () { return requestModuleActivation_1.requestModuleActivation; } });
var scheduler_1 = require("./src/mclp/scheduler");
Object.defineProperty(exports, "mclpDailyScheduler", { enumerable: true, get: function () { return scheduler_1.mclpDailyScheduler; } });
