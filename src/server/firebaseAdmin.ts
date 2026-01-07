// src/server/firebaseAdmin.ts
// THIS FILE IS SERVER-ONLY. DO NOT IMPORT IT IN CLIENT COMPONENTS OR PAGES.

import * as admin from "firebase-admin";

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: serviceAccount 
        ? admin.credential.cert(serviceAccount)
        : undefined, // No usar applicationDefault() si no hay serviceAccount
  });
}

export const getAdminDb = () => admin.firestore();
export const getAdminAuth = () => admin.auth();
export const getAdminStorage = () => admin.storage();
