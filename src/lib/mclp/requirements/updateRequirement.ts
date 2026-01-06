// src/lib/mclp/requirements/updateRequirement.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

export async function updateComplianceRequirement(
  companyId: string,
  requirementId: string,
  data: {
    nombreDocumento?: string;
    descripcion?: string;
    esObligatorio?: boolean;
  }
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
      ...data,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}
