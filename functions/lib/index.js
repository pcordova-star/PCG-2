"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase-admin/app");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
// Exportar la función principal de Next.js
var next_server_1 = require("./next-server");
Object.defineProperty(exports, "nextFramework", { enumerable: true, get: function () { return next_server_1.nextFramework; } });
// Exportar las funciones Callable
var createCompanyUser_1 = require("./createCompanyUser");
Object.defineProperty(exports, "createCompanyUser", { enumerable: true, get: function () { return createCompanyUser_1.createCompanyUser; } });
var setSuperAdmin_1 = require("./setSuperAdmin");
Object.defineProperty(exports, "setSuperAdminClaim", { enumerable: true, get: function () { return setSuperAdmin_1.setSuperAdminClaim; } });
var registrarAvanceRapido_1 = require("./registrarAvanceRapido");
Object.defineProperty(exports, "registrarAvanceRapido", { enumerable: true, get: function () { return registrarAvanceRapido_1.registrarAvanceRapido; } });
//# sourceMappingURL=index.js.map
