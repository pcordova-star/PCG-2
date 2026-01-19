// src/app/api/mclp/calendar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb, Timestamp as AdminTimestamp } from "@/server/firebaseAdmin";
import type { DocumentReference } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "@/server/lib/mclp/ensureMclpEnabled";

export const runtime = "nodejs";

async function createDefaultMonths(calendarRef: DocumentReference, year: number) {
    const batch = adminDb.batch();
    
    const programRef = adminDb.collection("compliancePrograms").doc(calendarRef.id.split('_')[0]);
    const programSnap = await programRef.get();
    const { diaCorteCarga = 25, diaLimiteRevision = 5, diaPago = 10 } = programSnap.data() || {};
  
    for (let m = 1; m <= 12; m++) {
      const monthId = `${year}-${String(m).padStart(2, '0')}`;
      const monthRef = calendarRef.collection("months").doc(monthId);

      const fechaCorte = new Date(Date.UTC(year, m - 1, diaCorteCarga));
      const fechaRevision = new Date(Date.UTC(year, m, diaLimiteRevision)); 
      const fechaDePago = new Date(Date.UTC(year, m, diaPago));

      batch.set(monthRef, {
        month: monthId,
        corteCarga: AdminTimestamp.fromDate(fechaCorte),
        limiteRevision: AdminTimestamp.fromDate(fechaRevision),
        fechaPago: AdminTimestamp.fromDate(fechaDePago),
        editable: true,
        createdAt: adminDb.FieldValue.serverTimestamp(),
        updatedAt: adminDb.FieldValue.serverTimestamp(),
      });
    }
  
    await batch.commit();
}

// GET /api/mclp/calendar?companyId=[ID]&year=[YEAR]
export async function GET(req: NextRequest) {
    try {
        const companyId = req.nextUrl.searchParams.get("companyId");
        const yearStr = req.nextUrl.searchParams.get("year");

        if (!companyId || !yearStr) {
            return NextResponse.json({ error: "companyId y year son requeridos" }, { status: 400 });
        }
        const year = parseInt(yearStr, 10);
        await ensureMclpEnabled(companyId);

        
        const calendarId = `${companyId}_${year}`;
        const ref = adminDb.collection("complianceCalendars").doc(calendarId);
        let snap = await ref.get();

        if (!snap.exists) {
            await ref.set({
                companyId, year, locked: false,
                createdAt: adminDb.FieldValue.serverTimestamp(),
                updatedAt: adminDb.FieldValue.serverTimestamp(),
            });
            await createDefaultMonths(ref, year);
            snap = await ref.get();
        }

        const monthsSnap = await ref.collection("months").orderBy("month").get();
        const months = monthsSnap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id, ...data,
                corteCarga: (data.corteCarga as AdminTimestamp)?.toDate().toISOString(),
                limiteRevision: (data.limiteRevision as AdminTimestamp)?.toDate().toISOString(),
                fechaPago: (data.fechaPago as AdminTimestamp)?.toDate().toISOString(),
                createdAt: (data.createdAt as AdminTimestamp)?.toDate().toISOString(),
                updatedAt: (data.updatedAt as AdminTimestamp)?.toDate().toISOString(),
            };
        });

        return NextResponse.json(months);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
