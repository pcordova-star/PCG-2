// src/lib/mclp/periods/listPeriods.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

export async function listCompliancePeriods(companyId: string, limit = 12) {
  await ensureMclpEnabled(companyId);

  const db = getAdminDb();
  const snap = await db
    .collection("compliancePeriods")
    .where("companyId", "==", companyId)
    .orderBy("period", "desc")
    .limit(limit)
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
