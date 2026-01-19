// workspace/functions/src/firebaseAdmin.ts
import * as admin from "firebase-admin";

let app: admin.app.App;

/**
 * Obtiene una instancia única y segura del SDK de Firebase Admin.
 * Se encarga de inicializar la app una sola vez.
 */
export function getAdminApp() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin;
}
