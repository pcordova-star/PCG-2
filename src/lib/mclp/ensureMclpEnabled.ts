// src/lib/mclp/ensureMclpEnabled.ts
import { getAdminDb } from "@/server/firebaseAdmin";

export async function ensureMclpEnabled(companyId: string) {
  const db = getAdminDb();
  const companyRef = db.collection("companies").doc(companyId);
  const snap = await companyRef.get();
  if (!snap.exists() || !snap.data()?.feature_compliance_module_enabled) {
    throw new Error("MCLP_DISABLED");
  }
}
