// src/lib/mclp/requirements/createRequirement.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

export async function createComplianceRequirement(
  companyId: string,
  input: {
    nombreDocumento: string;
    descripcion?: string;
    esObligatorio: boolean;
  }
) {
  await ensureMclpEnabled(companyId);

  const db = getAdminDb();
  const ref = db
    .collection("compliancePrograms")
    .doc(companyId)
    .collection("requirements")
    .doc();

  await ref.set({
    nombreDocumento: input.nombreDocumento,
    descripcion: input.descripcion ?? "",
    esObligatorio: input.esObligatorio,
    activo: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return ref.id;
}
