// src/lib/mclp/periods/closePeriod.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

export async function closeCompliancePeriod(companyId: string, periodId: string) {
  await ensureMclpEnabled(companyId);

  const db = getAdminDb();
  const ref = db.collection("compliancePeriods").doc(periodId);

  const snap = await ref.get();
  if (!snap.exists) throw new Error("PERIOD_NOT_FOUND");

  if (snap.get("estado") === "Cerrado") return { closed: false };

  await ref.set(
    {
      estado: "Cerrado",
      closedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );

  return { closed: true };
}
