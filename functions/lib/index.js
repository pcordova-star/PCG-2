"use strict";
// src/functions/src/index.ts
/**
 * Punto de entrada para todas las Cloud Functions.
 * NO inicializar Firebase Admin aquí. La inicialización se centraliza
 * en la función getAdminApp() para evitar errores en el runtime.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.processItemizadoJob = exports.analizarPlano = exports.createCompanyUser = void 0;
// Funciones activas
var createCompanyUser_1 = require("./createCompanyUser");
Object.defineProperty(exports, "createCompanyUser", { enumerable: true, get: function () { return createCompanyUser_1.createCompanyUser; } });
var analizarPlano_1 = require("./analizarPlano");
Object.defineProperty(exports, "analizarPlano", { enumerable: true, get: function () { return analizarPlano_1.analizarPlano; } });
var processItemizadoJob_1 = require("./processItemizadoJob");
Object.defineProperty(exports, "processItemizadoJob", { enumerable: true, get: function () { return processItemizadoJob_1.processItemizadoJob; } });
//# sourceMappingURL=index.js.map