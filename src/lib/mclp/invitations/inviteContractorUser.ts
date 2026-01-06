// src/lib/mclp/invitations/inviteContractorUser.ts
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

export async function inviteContractorUser(params: {
  companyId: string;
  subcontractorId: string;
  email: string;
  nombre: string;
}) {
  await ensureMclpEnabled(params.companyId);

  const auth = getAdminAuth();
  const db = getAdminDb();

  // 1) Crear o recuperar usuario Auth
  let user;
  try {
    user = await auth.getUserByEmail(params.email);
  } catch {
    user = await auth.createUser({
      email: params.email,
      displayName: params.nombre,
      emailVerified: false,
    });
  }

  // 2) Asociar user ↔ subcontractor
  await db.collection("users").doc(user.uid).set(
    {
      uid: user.uid,
      email: params.email,
      nombre: params.nombre,
      role: "contratista",
      companyId: params.companyId,
      subcontractorId: params.subcontractorId,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );

  await db.collection("subcontractors").doc(params.subcontractorId).update({
    userIds: Array.from(new Set([user.uid])),
    updatedAt: Timestamp.now(),
  });

  // 3) Generar link de activación
  const oob = await auth.generatePasswordResetLink(params.email, {
    url: `${process.env.APP_BASE_URL}/login/usuario`,
  });

  // 4) Enviar correo (Trigger Email)
  await db.collection("mail").add({
    to: params.email,
    template: {
      name: "invite-contractor",
      data: {
        nombre: params.nombre,
        actionUrl: oob,
      },
    },
  });

  return { uid: user.uid };
}
