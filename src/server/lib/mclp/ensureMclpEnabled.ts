// src/server/lib/mclp/ensureMclpEnabled.ts
import { adminDb } from "@/server/firebaseAdmin";

/**
 * Checks if the compliance module is enabled for a given company.
 * Throws an error if the module is disabled.
 * This function is for server-side use only.
 * @param companyId The ID of the company to check.
 */
export async function ensureMclpEnabled(companyId: string) {
  const companyRef = adminDb.collection("companies").doc(companyId);
  const snap = await companyRef.get();
  if (!snap.exists || !snap.data()?.feature_compliance_module_enabled) {
    throw new Error("MCLP_DISABLED: El Módulo de Cumplimiento Legal no está habilitado para esta empresa.");
  }
}
