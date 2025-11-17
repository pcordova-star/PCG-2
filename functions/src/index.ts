import { initializeApp, getApps } from "firebase-admin/app";

if (!getApps().length) {
  initializeApp();
}

// Las funciones callable ahora se manejan a través del servidor de Next.js o como funciones individuales
// export { createCompanyUser } from './createCompanyUser';
// export { setSuperAdminClaim } from './setSuperAdmin';
