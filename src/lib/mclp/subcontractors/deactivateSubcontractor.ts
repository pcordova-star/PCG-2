// src/lib/mclp/subcontractors/deactivateSubcontractor.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

export async function deactivateSubcontractor(companyId: string, id: string) {
  await ensureMclpEnabled(companyId);
  const db = getAdminDb();
  await db.collection("subcontractors").doc(id).set(
    { activo: false },
    { merge: true }
  );
}
