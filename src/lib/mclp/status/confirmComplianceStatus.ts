
// src/lib/mclp/status/confirmComplianceStatus.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "../ensureMclpEnabled";
import { evaluateSuggestedStatus } from "./evaluateSuggestedStatus";

export async function confirmComplianceStatus(params: {
  companyId: string;
  periodId: string;
  subcontractorId: string;
  adminUid: string;
  requiredRequirementIds: string[];
}) {
  await ensureMclpEnabled(params.companyId);

  const suggested = await evaluateSuggestedStatus(params);
  if (suggested !== "Listo para Cumplir") {
    throw new Error("NOT_ELIGIBLE_FOR_CUMPLE");
  }

  const db = getAdminDb();
  const ref = db
    .collection("compliancePeriods")
    .doc(params.periodId)
    .collection("status")
    .doc(params.subcontractorId);

  await ref.set({
    estado: "Cumple",
    fechaAsignacion: Timestamp.now(),
    asignadoPorUid: params.adminUid,
  });

  return { ok: true };
}
