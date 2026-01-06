// src/lib/mclp/periods/openCurrentPeriod.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "../ensureMclpEnabled";
import { getPeriodKey } from "./utils";

export async function openCurrentCompliancePeriod(companyId: string, now = new Date()) {
  await ensureMclpEnabled(companyId);

  const period = getPeriodKey(now);
  const db = getAdminDb();
  const id = `${companyId}_${period}`;
  const ref = db.collection("compliancePeriods").doc(id);

  const snap = await ref.get();
  if (snap.exists) return { id, period, created: false };

  await ref.set({
    companyId,
    period, // YYYY-MM
    estado: "Abierto para Carga",
    openedAt: Timestamp.fromDate(now),
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });

  return { id, period, created: true };
}
