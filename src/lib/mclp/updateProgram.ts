// src/lib/mclp/updateProgram.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "./ensureMclpEnabled";

export async function updateComplianceProgram(
  companyId: string,
  data: {
    periodicidad?: "mensual";
    diaCorteCarga?: number | null;
    diaLimiteRevision?: number | null;
    diaPago?: number | null;
  }
) {
  await ensureMclpEnabled(companyId);

  const db = getAdminDb();
  const ref = db.collection("compliancePrograms").doc(companyId);

  await ref.set(
    {
      ...data,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}
