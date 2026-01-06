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
    // Convertir Timestamp a string ISO para serialización segura
    const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate().toISOString() 
        : new Date().toISOString();
    
    const updatedAt = data.updatedAt instanceof Timestamp 
        ? data.updatedAt.toDate().toISOString()
        : createdAt; // Fallback a createdAt si no existe
        
    return { id: d.id, ...data, createdAt, updatedAt };
  });
}
