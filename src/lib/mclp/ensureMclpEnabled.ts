// src/lib/mclp/ensureMclpEnabled.ts
import { getAdminDb } from "@/lib/firebaseAdmin";

export async function ensureMclpEnabled(companyId: string) {
  const db = getAdminDb();
  const snap = await db.collection("companies").doc(companyId).get();
  if (!snap.exists) {
    throw new Error("Company not found");
  }
  const enabled = snap.get("feature_compliance_module_enabled") === true;
  if (!enabled) {
    const err = new Error("El Módulo de Cumplimiento Legal no está habilitado para esta empresa.");
    // @ts-ignore
    err.code = "MCLP_DISABLED";
    throw err;
  }
}
