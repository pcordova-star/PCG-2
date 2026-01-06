// src/lib/mclp/requirements/createRequirement.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "../ensureMclpEnabled";
import { RequisitoDocumento } from "@/types/pcg";

export async function createRequirement(
  companyId: string,
  data: Omit<RequisitoDocumento, 'id' | 'activo'>
) {
  await ensureMclpEnabled(companyId);

  const db = getAdminDb();
  const ref = db
    .collection("compliancePrograms")
    .doc(companyId)
    .collection("requirements")
    .doc();

  await ref.set({
    ...data,
    activo: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return ref.id;
}
