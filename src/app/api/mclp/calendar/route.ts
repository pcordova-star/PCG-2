// src/app/api/mclp/calendar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/server/firebaseAdmin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "@/lib/mclp/ensureMclpEnabled";

async function createDefaultMonths(calendarRef: FirebaseFirestore.DocumentReference, year: number) {
    const db = getAdminDb();
    const batch = db.batch();
    
    const programRef = db.collection("compliancePrograms").doc(calendarRef.id.split('_')[0]);
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

        const db = getAdminDb();
        const calendarId = `${companyId}_${year}`;
        const ref = db.collection("complianceCalendars").doc(calendarId);
        let snap = await ref.get();

        if (!snap.exists) {
            await ref.set({
                companyId, year, locked: false,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
            await createDefaultMonths(ref, year);
            snap = await ref.get();
        }

        const monthsSnap = await ref.collection("months").orderBy("month").get();
        const months = monthsSnap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id, ...data,
                corteCarga: (data.corteCarga as Timestamp)?.toDate().toISOString(),
                limiteRevision: (data.limiteRevision as Timestamp)?.toDate().toISOString(),
                fechaPago: (data.fechaPago as Timestamp)?.toDate().toISOString(),
                createdAt: (data.createdAt as Timestamp)?.toDate().toISOString(),
                updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString(),
            };
        });

        return NextResponse.json(months);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


// PUT /api/mclp/calendar (for updating a month)
export async function PUT(req: NextRequest) {
    try {
        const { companyId, year, monthId, data } = await req.json();

        if (!companyId || !year || !monthId || !data) {
            return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
        }
        await ensureMclpEnabled(companyId);

        const db = getAdminDb();
        const calendarId = `${companyId}_${year}`;
        const ref = db.collection("complianceCalendars").doc(calendarId).collection("months").doc(monthId);

        const snap = await ref.get();
        if (!snap.exists() || snap.data()?.editable === false) {
            throw new Error("Mes no encontrado o bloqueado para edición.");
        }
        
        await ref.update({
            corteCarga: Timestamp.fromDate(new Date(data.corteCarga)),
            limiteRevision: Timestamp.fromDate(new Date(data.limiteRevision)),
            fechaPago: Timestamp.fromDate(new Date(data.fechaPago)),
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, id: monthId });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
