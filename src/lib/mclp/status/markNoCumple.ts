
// src/lib/mclp/status/markNoCumple.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

export async function markNoCumple(params: {
  companyId: string;
  periodId: string;
  subcontractorId: string;
  adminUid: string;
}) {
  await ensureMclpEnabled(params.companyId);

  const db = getAdminDb();
  await db
    .collection("compliancePeriods")
    .doc(params.periodId)
    .collection("status")
    .doc(params.subcontractorId)
    .set({
      estado: "No Cumple",
      fechaAsignacion: Timestamp.now(),
      asignadoPorUid: params.adminUid,
    });
}
