// src/lib/mclp/subcontractors/actions.ts
"use server";

import { getAdminAuth, getAdminDb } from "@/server/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

// --- Tipos de Datos ---
export interface CreateSubcontractorInput {
  companyId: string;
  razonSocial: string;
  rut: string;
  contactoNombre: string;
  contactoEmail: string;
}

export interface InviteContractorInput {
  companyId: string;
  subcontractorId: string;
  email: string;
  nombre: string;
}

// --- Listar Subcontratistas ---
export async function listSubcontractorsAction(companyId: string) {
  try {
    const db = getAdminDb();
    await ensureMclpEnabled(companyId, db);
    const snap = await db
      .collection("subcontractors")
      .where("companyId", "==", companyId)
      .where("activo", "==", true)
      .get();
      
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Crear Subcontratista ---
export async function createSubcontractorAction(input: CreateSubcontractorInput) {
  try {
    const db = getAdminDb();
    await ensureMclpEnabled(input.companyId, db);
    const ref = db.collection("subcontractors").doc();
    await ref.set({
      companyId: input.companyId,
      razonSocial: input.razonSocial,
      rut: input.rut,
      contactoPrincipal: {
        nombre: input.contactoNombre,
        email: input.contactoEmail,
      },
      activo: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return { success: true, id: ref.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Desactivar Subcontratista ---
export async function deactivateSubcontractorAction(companyId: string, subcontractorId: string) {
    try {
        const db = getAdminDb();
        await ensureMclpEnabled(companyId, db);
        await db.collection("subcontractors").doc(subcontractorId).update({
            activo: false,
            updatedAt: Timestamp.now(),
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- Invitar Usuario a Subcontrato ---
export async function inviteContractorAction(params: InviteContractorInput) {
  try {
    const db = getAdminDb();
    const auth = getAdminAuth();
    await ensureMclpEnabled(params.companyId, db);

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

    // 2) Asociar user <-> subcontractor
    await db.collection("users").doc(user.uid).set({
        uid: user.uid,
        email: params.email,
        nombre: params.nombre,
        role: "contratista",
        companyId: params.companyId,
        subcontractorId: params.subcontractorId,
        updatedAt: Timestamp.now(),
    }, { merge: true });

    const subcontractorRef = db.collection("subcontractors").doc(params.subcontractorId);
    const subcontractorSnap = await subcontractorRef.get();
    const existingUserIds = subcontractorSnap.data()?.userIds || [];
    
    await subcontractorRef.update({
        userIds: Array.from(new Set([...existingUserIds, user.uid])),
        updatedAt: Timestamp.now(),
    });

    // 3) Generar link de activación
    const loginUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/login/usuario`;
    const oob = await auth.generatePasswordResetLink(params.email, { url: loginUrl });

    // 4) Enviar correo (Trigger Email)
    await db.collection("mail").add({
        to: params.email,
        message: {
            subject: `Invitación al Portal de Cumplimiento`,
            html: `
                <p>Hola ${params.nombre},</p>
                <p>Has sido invitado a unirte al portal de cumplimiento de PCG.</p>
                <p>Para activar tu cuenta y establecer tu contraseña, haz clic en el siguiente enlace:</p>
                <p><a href="${oob}">Activar cuenta</a></p>
            `,
        },
    });

    return { success: true, uid: user.uid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
