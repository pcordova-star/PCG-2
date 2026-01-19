"use server";

import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export const bucket = admin.storage().bucket();
export const adminDb = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
export default admin;
