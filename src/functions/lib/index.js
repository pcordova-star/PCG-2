"use strict";
/**
 * Punto de entrada REAL de Cloud Functions.
 * Solo exportamos funciones que existen en src/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestModuleActivation = exports.mclpDailyScheduler = exports.createCompanyUser = void 0;
var createCompanyUser_1 = require("./createCompanyUser");
Object.defineProperty(exports, "createCompanyUser", { enumerable: true, get: function () { return createCompanyUser_1.createCompanyUser; } });
var scheduler_1 = require("./mclp/scheduler");
Object.defineProperty(exports, "mclpDailyScheduler", { enumerable: true, get: function () { return scheduler_1.mclpDailyScheduler; } });
var requestModuleActivation_1 = require("./requestModuleActivation");
Object.defineProperty(exports, "requestModuleActivation", { enumerable: true, get: function () { return requestModuleActivation_1.requestModuleActivation; } });
