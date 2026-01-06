// src/lib/mclp/subcontractors/createSubcontractor.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

export async function createSubcontractor(companyId: string, input: {
  razonSocial: string;
  rut: string;
  representanteLegal?: string;
  contactoPrincipal: { nombre: string; email: string };
}) {
  await ensureMclpEnabled(companyId);

  const db = getAdminDb();
  const ref = db.collection("subcontractors").doc();

  await ref.set({
    companyId,
    razonSocial: input.razonSocial,
    rut: input.rut,
    representanteLegal: input.representanteLegal ?? "",
    contactoPrincipal: input.contactoPrincipal,
    activo: true,
    userIds: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return ref.id;
}
