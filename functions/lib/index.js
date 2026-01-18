"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analizarPlano = exports.createCompanyUser = void 0;
const admin = require("firebase-admin");
admin.initializeApp();
// Funciones activas
var createCompanyUser_1 = require("./createCompanyUser");
Object.defineProperty(exports, "createCompanyUser", { enumerable: true, get: function () { return createCompanyUser_1.createCompanyUser; } });
var analizarPlano_1 = require("./analizarPlano");
Object.defineProperty(exports, "analizarPlano", { enumerable: true, get: function () { return analizarPlano_1.analizarPlano; } });
//# sourceMappingURL=index.js.map