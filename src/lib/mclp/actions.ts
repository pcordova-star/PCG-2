// src/lib/mclp/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { getAdminDb } from "../firebaseAdmin";
import { ensureMclpEnabled } from "./ensureMclpEnabled";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { ProgramaCumplimiento, RequisitoDocumento } from "@/types/pcg";

// --- Helper Functions ---
async function handleAction(action: Function) {
  try {
    const result = await action();
    return { success: true, data: result ?? null };
  } catch (error: any) {
    console.error(`[MCLP Action Error]: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// --- Program Actions ---

export async function getComplianceProgramAction(companyId: string) {
  return handleAction(async () => {
    await ensureMclpEnabled(companyId);
    const db = getAdminDb();
    const ref = db.collection("compliancePrograms").doc(companyId);
    let snap = await ref.get();
    
    if (!snap.exists) {
      await ref.set({
        companyId,
        periodicidad: "mensual",
        diaCorteCarga: 25,
        diaLimiteRevision: 5,
        diaPago: 10,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      snap = await ref.get();
    }
    
    const data = snap.data();
    return { id: snap.id, ...data } as ProgramaCumplimiento;
  });
}

export async function updateComplianceProgramAction(companyId: string, data: Partial<ProgramaCumplimiento>) {
  return handleAction(async () => {
    await ensureMclpEnabled(companyId);
    const db = getAdminDb();
    const ref = db.collection("compliancePrograms").doc(companyId);
    await ref.set({ ...data, updatedAt: Timestamp.now() }, { merge: true });
    revalidatePath('/cumplimiento/admin/programa');
  });
}

// --- Requirement Actions ---

export async function listRequirementsAction(companyId: string) {
  return handleAction(async () => {
    await ensureMclpEnabled(companyId);
    const db = getAdminDb();
    const snap = await db
      .collection("compliancePrograms")
      .doc(companyId)
      .collection("requirements")
      .where("activo", "==", true)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as RequisitoDocumento));
  });
}

export async function createRequirementAction(companyId: string, data: Omit<RequisitoDocumento, 'id' | 'activo'>) {
    return handleAction(async () => {
        await ensureMclpEnabled(companyId);
        const db = getAdminDb();
        const ref = db.collection("compliancePrograms").doc(companyId).collection("requirements").doc();
        await ref.set({
            ...data,
            activo: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        revalidatePath('/cumplimiento/admin/programa');
        return ref.id;
    });
}

export async function updateRequirementAction(companyId: string, reqId: string, data: Partial<Omit<RequisitoDocumento, 'id'>>) {
    return handleAction(async () => {
        await ensureMclpEnabled(companyId);
        const db = getAdminDb();
        const ref = db.collection("compliancePrograms").doc(companyId).collection("requirements").doc(reqId);
        await ref.set({ ...data, updatedAt: Timestamp.now() }, { merge: true });
        revalidatePath('/cumplimiento/admin/programa');
    });
}

export async function deactivateRequirementAction(companyId: string, reqId: string) {
    return handleAction(async () => {
        await ensureMclpEnabled(companyId);
        const db = getAdminDb();
        const ref = db.collection("compliancePrograms").doc(companyId).collection("requirements").doc(reqId);
        await ref.update({ activo: false, updatedAt: Timestamp.now() });
        revalidatePath('/cumplimiento/admin/programa');
    });
}
