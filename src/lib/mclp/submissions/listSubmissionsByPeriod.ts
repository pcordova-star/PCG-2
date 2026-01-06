// src/lib/mclp/submissions/listSubmissionsByPeriod.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

export async function listSubmissionsByPeriod(
  companyId: string,
  periodId: string,
  subcontractorId?: string
) {
  await ensureMclpEnabled(companyId);

  const db = getAdminDb();
  let q = db
    .collection("compliancePeriods")
    .doc(periodId)
    .collection("submissions") as FirebaseFirestore.Query;

  if (subcontractorId) {
    q = q.where("subcontractorId", "==", subcontractorId);
  }

  const snap = await q.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
