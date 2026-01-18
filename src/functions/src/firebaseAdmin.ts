import * as admin from "firebase-admin";

let app: admin.app.App;

export function getAdminApp() {
  if (!app) {
    app = admin.initializeApp();
  }
  return app;
}
