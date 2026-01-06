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
  await db.collection("subcontractors").add({
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
  });
}
