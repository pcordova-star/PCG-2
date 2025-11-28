"use strict";
// src/functions/src/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrarAvanceRapido = exports.setSuperAdminClaim = exports.createCompanyUser = void 0;
/**
 * Este archivo es el punto de entrada para todas las Cloud Functions.
 * Cada función se importa desde su propio archivo y se exporta para que Firebase la despliegue.
 */
const app_1 = require("firebase-admin/app");
// Inicializa Firebase Admin SDK solo si no se ha hecho antes.
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
// Exporta las funciones callable para que estén disponibles en el backend.
// El nombre de la propiedad del objeto exportado será el nombre de la función en Firebase.
var createCompanyUser_1 = require("./createCompanyUser");
Object.defineProperty(exports, "createCompanyUser", { enumerable: true, get: function () { return createCompanyUser_1.createCompanyUser; } });
var setSuperAdmin_1 = require("./setSuperAdmin");
Object.defineProperty(exports, "setSuperAdminClaim", { enumerable: true, get: function () { return setSuperAdmin_1.setSuperAdminClaim; } });
var registrarAvanceRapido_1 = require("./registrarAvanceRapido");
Object.defineProperty(exports, "registrarAvanceRapido", { enumerable: true, get: function () { return registrarAvanceRapido_1.registrarAvanceRapido; } });
//# sourceMappingURL=index.js.map