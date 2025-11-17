"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase-admin/app");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
// Las funciones callable ahora se manejan a través del servidor de Next.js o como funciones individuales
// export { createCompanyUser } from './createCompanyUser';
// export { setSuperAdminClaim } from './setSuperAdmin';
//# sourceMappingURL=index.js.map