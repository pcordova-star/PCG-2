// src/lib/comparacion-planos/firestore.ts
import admin from "@/server/firebaseAdmin";
import { ComparacionJob, ComparacionJobStatus } from "@/types/comparacion-planos";

export async function getComparacionJob(jobId: string): Promise<ComparacionJob | null> {
  const db = admin.firestore();
  const docRef = db.collection("comparacionPlanosJobs").doc(jobId);
  const snap = await docRef.get();
  if (!snap.exists) {
    return null;
  }
  return { id: snap.id, ...snap.data() } as ComparacionJob;
}

export async function updateComparacionJob(jobId: string, data: object) {
  const db = admin.firestore();
  const docRef = db.collection("comparacionPlanosJobs").doc(jobId);
  await docRef.update({
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// Specific helper for status
export async function updateComparacionJobStatus(jobId: string, status: ComparacionJobStatus) {
  await updateComparacionJob(jobId, { status });
}
