
// src/lib/mclp/status/evaluateSuggestedStatus.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

export async function evaluateSuggestedStatus(params: {
  companyId: string;
  periodId: string;
  subcontractorId: string;
  requiredRequirementIds: string[];
}) {
  await ensureMclpEnabled(params.companyId);

  const db = getAdminDb();
  const submissionsSnap = await db
    .collection("compliancePeriods")
    .doc(params.periodId)
    .collection("submissions")
    .where("subcontractorId", "==", params.subcontractorId)
    .get();

  const byReq = new Map<string, string>();
  submissionsSnap.docs.forEach(d => {
    byReq.set(d.get("requirementId"), d.get("estado"));
  });

  let hasPending = false;
  let hasObserved = false;

  for (const reqId of params.requiredRequirementIds) {
    const estado = byReq.get(reqId);
    if (!estado) hasPending = true;
    else if (estado === "Observado") hasObserved = true;
  }

  if (hasPending || hasObserved) return "No Cumple";
  return "Listo para Cumplir";
}
