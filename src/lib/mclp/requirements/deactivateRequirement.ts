// src/lib/mclp/requirements/deactivateRequirement.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

export async function deactivateComplianceRequirement(
  companyId: string,
  requirementId: string
) {
  await ensureMclpEnabled(companyId);

  const db = getAdminDb();
  const ref = db
    .collection("compliancePrograms")
    .doc(companyId)
    .collection("requirements")
    .doc(requirementId);

  await ref.set(
    {
      activo: false,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}
