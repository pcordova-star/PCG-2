import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

export const bucket = admin.storage().bucket();
export default admin;
