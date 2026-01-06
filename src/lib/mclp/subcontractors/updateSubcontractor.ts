// src/lib/mclp/subcontractors/updateSubcontractor.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

export async function updateSubcontractor(
  companyId: string,
  subcontractorId: string,
  data: Partial<{
    representanteLegal: string;
    contactoPrincipal: { nombre: string; email: string };
  }>
) {
  await ensureMclpEnabled(companyId);

  const db = getAdminDb();
  await db.collection("subcontractors").doc(subcontractorId).set(
    { ...data, updatedAt: Timestamp.now() },
    { merge: true }
  );
}

export async function deactivateSubcontractor(
  companyId: string,
  subcontractorId: string
) {
  await ensureMclpEnabled(companyId);

  const db = getAdminDb();
  await db.collection("subcontractors").doc(subcontractorId).set(
    { activo: false, updatedAt: Timestamp.now() },
    { merge: true }
  );
}
