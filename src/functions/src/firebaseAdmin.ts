// src/functions/src/firebaseAdmin.ts
import * as admin from "firebase-admin";

export function getAdminApp() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin;
}
