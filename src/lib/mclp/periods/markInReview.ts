// src/lib/mclp/periods/markInReview.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

export async function markPeriodInReview(companyId: string, periodId: string) {
  await ensureMclpEnabled(companyId);

  const db = getAdminDb();
  await db.collection("compliancePeriods").doc(periodId).set(
    {
      estado: "En Revisión",
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}
