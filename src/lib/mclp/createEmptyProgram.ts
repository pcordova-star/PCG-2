// src/lib/mclp/createEmptyProgram.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "./ensureMclpEnabled";

export async function createEmptyComplianceProgram(companyId: string) {
  await ensureMclpEnabled(companyId);

  const db = getAdminDb();
  const ref = db.collection("compliancePrograms").doc(companyId);

  const snap = await ref.get();
  if (snap.exists) return; // idempotente

  await ref.set({
    companyId,
    periodicidad: "mensual",
    diaCorteCarga: null,
    diaLimiteRevision: null,
    diaPago: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}
