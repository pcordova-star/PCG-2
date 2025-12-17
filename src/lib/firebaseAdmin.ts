// src/lib/firebaseAdmin.ts
import * as admin from "firebase-admin";
import type { ServiceAccount } from "firebase-admin";

let cachedApp: admin.app.App | null = null;

function loadServiceAccountFromEnv(): ServiceAccount {
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("Falta FIREBASE_ADMIN_SERVICE_ACCOUNT en Vercel.");
  }

  const parsed = JSON.parse(raw);

  // Vercel suele guardar el JSON con \\n en la private_key
  if (typeof parsed.private_key === "string") {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }

  return parsed as ServiceAccount;
}

export function getAdminApp(): admin.app.App {
  if (cachedApp) return cachedApp;
  if (admin.apps.length) {
    cachedApp = admin.apps[0]!;
    return cachedApp;
  }

  // En GCP (Cloud Run / App Hosting / Functions) suele funcionar sin cert
  // PERO en Vercel NO. Por eso: si hay service account, úsala.
  if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT) {
    const sa = loadServiceAccountFromEnv();
    cachedApp = admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId: process.env.GOOGLE_CLOUD_PROJECT || sa.project_id,
    });
    return cachedApp;
  }

  // Fallback sólo si estás realmente en entorno GCP con ADC configurado
  cachedApp = admin.initializeApp();
  return cachedApp;
}

export function getAdminDb() {
  return getAdminApp().firestore();
}

export function getAdminAuth() {
  return getAdminApp().auth();
}
