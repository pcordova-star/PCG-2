
// src/lib/mclp/status/listStatusForFinance.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

export async function listComplianceStatusForPeriod(companyId: string, periodId: string) {
  await ensureMclpEnabled(companyId);

  const db = getAdminDb();
  const snap = await db
    .collection("compliancePeriods")
    .doc(periodId)
    .collection("status")
    .get();

  return snap.docs.map(d => ({
    subcontractorId: d.id,
    ...d.data(),
  }));
}
