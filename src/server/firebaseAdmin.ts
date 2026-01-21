"use server";

import admin from "firebase-admin";

if (!admin.apps.length) {
  if (!process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT) {
    // Esta verificación es crucial para evitar errores en entornos donde la variable no está configurada.
    throw new Error(
      "La variable de entorno FIREBASE_ADMIN_SERVICE_ACCOUNT no está definida. No se puede inicializar el SDK de Admin."
    );
  }

  const serviceAccount = JSON.parse(
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export const bucket = admin.storage().bucket();
export const adminDb = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
export default admin;
