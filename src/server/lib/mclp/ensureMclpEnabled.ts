// src/server/lib/mclp/ensureMclpEnabled.ts
import type { Firestore } from "firebase-admin/firestore";

/**
 * Checks if the compliance module is enabled for a given company.
 * Throws an error if the module is disabled.
 * This function is for server-side use only.
 * @param db The Firestore admin instance.
 * @param companyId The ID of the company to check.
 */
export async function ensureMclpEnabled(db: Firestore, companyId: string) {
  const companyRef = db.collection("companies").doc(companyId);
  const snap = await companyRef.get();
  if (!snap.exists || !snap.data()?.feature_compliance_module_enabled) {
    throw new Error("MCLP_DISABLED: El Módulo de Cumplimiento Legal no está habilitado para esta empresa.");
  }
}
