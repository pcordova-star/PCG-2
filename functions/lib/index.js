"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCompanyUser = void 0;
// functions/src/index.ts
const v2_1 = require("firebase-functions/v2");
// Define la región para todas las funciones v2 exportadas desde este archivo.
(0, v2_1.setGlobalOptions)({ region: "southamerica-west1" });
// Exporta ÚNICAMENTE la función requerida para aislar el despliegue.
var createCompanyUser_1 = require("./createCompanyUser");
Object.defineProperty(exports, "createCompanyUser", { enumerable: true, get: function () { return createCompanyUser_1.createCompanyUser; } });
//# sourceMappingURL=index.js.map