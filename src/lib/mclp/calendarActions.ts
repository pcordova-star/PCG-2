// src/lib/mclp/calendarActions.ts
"use server";

import { getAdminDb } from "../firebaseAdmin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { ensureMclpEnabled } from "./ensureMclpEnabled";

// --- Helper Functions ---
async function handleAction(action: Function) {
  try {
    const result = await action();
    return { success: true, data: result ?? null };
  } catch (error: any) {
    console.error(`[MCLP Calendar Action Error]: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// --- Calendar Actions ---

async function createDefaultMonths(calendarRef: FirebaseFirestore.DocumentReference, year: number) {
    const db = getAdminDb();
    const batch = db.batch();
    
    const programRef = db.collection("compliancePrograms").doc(calendarRef.id.split('_')[0]);
    const programSnap = await programRef.get();
    const { diaCorteCarga = 25, diaLimiteRevision = 5, diaPago = 10 } = programSnap.data() || {};
  
    for (let m = 1; m <= 12; m++) {
      const monthId = `${year}-${String(m).padStart(2, '0')}`;
      const monthRef = calendarRef.collection("months").doc(monthId);

      // El corte es en el mes actual, la revisión y pago en el siguiente
      const fechaCorte = new Date(Date.UTC(year, m - 1, diaCorteCarga));
      const fechaRevision = new Date(Date.UTC(year, m, diaLimiteRevision));
      const fechaDePago = new Date(Date.UTC(year, m, diaPago));

      batch.set(monthRef, {
        month: monthId,
        corteCarga: Timestamp.fromDate(fechaCorte),
        limiteRevision: Timestamp.fromDate(fechaRevision),
        fechaPago: Timestamp.fromDate(fechaDePago),
        editable: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  
    await batch.commit();
}


export async function getOrCreateCalendarAction(companyId: string, year: number) {
    return handleAction(async () => {
        await ensureMclpEnabled(companyId);
        const db = getAdminDb();
        const calendarId = `${companyId}_${year}`;
        const ref = db.collection("complianceCalendars").doc(calendarId);
        let snap = await ref.get();

        if (!snap.exists) {
            await ref.set({
                companyId,
                year,
                locked: false,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
            await createDefaultMonths(ref, year);
            snap = await ref.get(); // Re-fetch
        }
        return { id: snap.id, ...snap.data() };
    });
}

export async function listCalendarMonthsAction(companyId: string, year: number) {
  return handleAction(async () => {
    await ensureMclpEnabled(companyId);
    const db = getAdminDb();
    const calendarId = `${companyId}_${year}`;
    const snap = await db
      .collection("complianceCalendars")
      .doc(calendarId)
      .collection("months")
      .orderBy("month")
      .get();
      
    return snap.docs.map(d => {
        const data = d.data();
        const serialized = {
            id: d.id,
            ...data,
            corteCarga: (data.corteCarga as Timestamp).toDate().toISOString(),
            limiteRevision: (data.limiteRevision as Timestamp).toDate().toISOString(),
            fechaPago: (data.fechaPago as Timestamp).toDate().toISOString(),
            createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
            updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
        };
        return serialized;
    });
  });
}

export async function updateCalendarMonthAction(companyId: string, year: number, monthId: string, data: { corteCarga: string, limiteRevision: string, fechaPago: string }) {
    return handleAction(async () => {
        await ensureMclpEnabled(companyId);
        const db = getAdminDb();
        const calendarId = `${companyId}_${year}`;
        const ref = db.collection("complianceCalendars").doc(calendarId).collection("months").doc(monthId);

        const snap = await ref.get();
        if (!snap.exists) throw new Error("Mes no encontrado.");
        if (snap.data()?.editable === false) throw new Error("Mes bloqueado, no se puede editar.");
        
        await ref.update({
            corteCarga: Timestamp.fromDate(new Date(data.corteCarga)),
            limiteRevision: Timestamp.fromDate(new Date(data.limiteRevision)),
            fechaPago: Timestamp.fromDate(new Date(data.fechaPago)),
            updatedAt: FieldValue.serverTimestamp(),
        });
        revalidatePath('/cumplimiento/admin/calendario'); // o la ruta que corresponda
    });
}
