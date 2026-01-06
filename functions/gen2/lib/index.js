"use strict";
// functions/gen2/src/index.ts
/**
 * Este archivo es el punto de entrada para todas las Cloud Functions de Gen2.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertHeicToJpg = exports.deactivateCompanyUser = void 0;
// --- Funciones HTTP (Gen2 onRequest) ---
var deactivateCompanyUser_1 = require("./deactivateCompanyUser");
Object.defineProperty(exports, "deactivateCompanyUser", { enumerable: true, get: function () { return deactivateCompanyUser_1.deactivateCompanyUser; } });
// --- Triggers de eventos (Gen2) ---
var convertHeic_1 = require("./convertHeic");
Object.defineProperty(exports, "convertHeicToJpg", { enumerable: true, get: function () { return convertHeic_1.convertHeicToJpg; } });
// export { processItemizadoJob } from './processItemizadoJob';
