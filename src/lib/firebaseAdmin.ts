// src/lib/firebaseAdmin.ts
import { getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function initAdmin() {
  if (getApps().length) return;
  // Ruta A: JSON en env (recomendado para Firebase Studio / local)
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (json) {
    const sa = JSON.parse(json) as ServiceAccount;
    initializeApp({ credential: cert(sa) });
    return;
  }
  // Ruta B: Credenciales por defecto (Cloud/Firebase Hosting)
  try {
    initializeApp({ credential: applicationDefault() });
  } catch {
    // Ruta C (fallback): intenta sin credenciales explícitas (solo si corremos en entornos con permisos)
    initializeApp();
  }
}

export function dbAdmin() {
  initAdmin();
  return getFirestore();
}
