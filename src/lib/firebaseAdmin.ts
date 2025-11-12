// src/lib/firebaseAdmin.ts
import 'server-only'
import { cert, getApps, initializeApp, applicationDefault, App } from 'firebase-admin/app'

export function getAdminApp(): App {
  const apps = getApps()
  if (apps.length) return apps[0]!
  
  // En Firebase Studio, usamos la variable de entorno SERVICE_ACCOUNT_JSON.
  // En Cloud Run/App Hosting, `applicationDefault()` funcionará automáticamente.
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT
    ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    : applicationDefault()
    
  return initializeApp({
    credential: svc,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT,
  })
}
