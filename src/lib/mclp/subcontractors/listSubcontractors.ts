// src/lib/mclp/subcontractors/listSubcontractors.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { ensureMclpEnabled } from "../ensureMclpEnabled";
import { Timestamp } from "firebase-admin/firestore";

export async function listSubcontractors(companyId: string) {
  await ensureMclpEnabled(companyId);
  const db = getAdminDb();
  const snap = await db
    .collection("subcontractors")
    .where("companyId", "==", companyId)
    .where("activo", "==", true)
    .get();

  return snap.docs.map(d => {
    const data = d.data();
    // Convert Timestamp to a serializable format (ISO string)
    const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate().toISOString() 
        : new Date().toISOString();
        
    return { id: d.id, ...data, createdAt };
  });
}
