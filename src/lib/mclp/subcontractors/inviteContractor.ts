// src/lib/mclp/subcontractors/inviteContractor.ts
import { getAuth } from "firebase-admin/auth";
import { getAdminDb } from "@/lib/firebaseAdmin";
import * as admin from 'firebase-admin';

export async function inviteContractor(params: {
  subcontractorId: string;
  companyId: string;
  email: string;
  nombre: string;
}) {
  const auth = getAuth();
  const db = getAdminDb();

  const user = await auth.createUser({
    email: params.email,
    displayName: params.nombre,
  });

  await db.collection("users").doc(user.uid).set({
    role: "contratista",
    companyId: params.companyId,
    subcontractorId: params.subcontractorId,
    createdAt: new Date(),
  });

  await db.collection("subcontractors")
    .doc(params.subcontractorId)
    .update({
      userIds: admin.firestore.FieldValue.arrayUnion(user.uid),
    });

  // Trigger Email (ya existente)
  await db.collection("mail").add({
    to: params.email,
    template: {
      name: "invite-contractor",
      data: { nombre: params.nombre },
    },
  });
}
