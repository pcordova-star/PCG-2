"use strict";
// functions/gen2/src/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.processItemizadoJob = exports.convertHeicToJpg = exports.analizarPlano = exports.requestModuleActivation = exports.deactivateCompanyUser = void 0;
// --- Funciones HTTP (Gen2 onRequest) ---
var deactivateCompanyUser_1 = require("./deactivateCompanyUser");
Object.defineProperty(exports, "deactivateCompanyUser", { enumerable: true, get: function () { return deactivateCompanyUser_1.deactivateCompanyUser; } });
var requestModuleActivation_1 = require("./requestModuleActivation");
Object.defineProperty(exports, "requestModuleActivation", { enumerable: true, get: function () { return requestModuleActivation_1.requestModuleActivation; } });
var analizarPlano_1 = require("./analizarPlano"); // <-- Función añadida aquí
Object.defineProperty(exports, "analizarPlano", { enumerable: true, get: function () { return analizarPlano_1.analizarPlano; } });
// --- Triggers de eventos (Gen2) ---
var convertHeic_1 = require("./convertHeic");
Object.defineProperty(exports, "convertHeicToJpg", { enumerable: true, get: function () { return convertHeic_1.convertHeicToJpg; } });
var processItemizadoJob_1 = require("./processItemizadoJob");
Object.defineProperty(exports, "processItemizadoJob", { enumerable: true, get: function () { return processItemizadoJob_1.processItemizadoJob; } });
