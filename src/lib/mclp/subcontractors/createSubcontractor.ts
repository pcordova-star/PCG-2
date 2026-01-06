// src/lib/mclp/subcontractors/createSubcontractor.ts
import { getAdminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

export async function createSubcontractor(params: {
  companyId: string;
  razonSocial: string;
  rut: string;
  contactoNombre: string;
  contactoEmail: string;
}) {
  await ensureMclpEnabled(params.companyId);

  const db = getAdminDb();
  const ref = db.collection("subcontractors").doc();

  await ref.set({
    companyId: params.companyId,
    razonSocial: params.razonSocial,
    rut: params.rut,
    contactoPrincipal: {
      nombre: params.contactoNombre,
      email: params.contactoEmail,
    },
    activo: true,
    userIds: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return ref.id;
}
