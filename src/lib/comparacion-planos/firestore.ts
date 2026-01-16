// src/lib/comparacion-planos/firestore.ts
import { getAdminApp } from "@/server/firebaseAdmin";
import { ComparacionJob, ComparacionJobStatus } from "@/types/comparacion-planos";
import { FieldValue } from "firebase-admin/firestore";

const db = getAdminApp().firestore();
const jobsCollection = db.collection("comparacionPlanosJobs");

export async function getComparacionJob(jobId: string): Promise<ComparacionJob | null> {
  const docRef = jobsCollection.doc(jobId);
  const snap = await docRef.get();
  if (!snap.exists) {
    return null;
  }
  return { id: snap.id, ...snap.data() } as ComparacionJob;
}

export async function updateComparacionJob(jobId: string, data: object) {
  const docRef = jobsCollection.doc(jobId);
  // Usamos notación de puntos para actualizar campos anidados sin sobreescribir el objeto completo.
  await docRef.update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// Specific helper for status
export async function updateComparacionJobStatus(jobId: string, status: ComparacionJobStatus) {
  await updateComparacionJob(jobId, { status });
}
