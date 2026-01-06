// src/lib/mclp/requirements/listRequirements.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

export async function listActiveRequirements(companyId: string) {
  await ensureMclpEnabled(companyId);

  const db = getAdminDb();
  const snap = await db
    .collection("compliancePrograms")
    .doc(companyId)
    .collection("requirements")
    .where("activo", "==", true)
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
