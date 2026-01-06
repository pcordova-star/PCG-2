// src/lib/mclp/subcontractors/listSubcontractors.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

export async function listSubcontractors(companyId: string) {
  await ensureMclpEnabled(companyId);
  const db = getAdminDb();
  const snap = await db
    .collection("subcontractors")
    .where("companyId", "==", companyId)
    .where("activo", "==", true)
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
