// src/app/api/mclp/calendar/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/server/firebaseAdmin";
import type { Firestore } from "firebase-admin/firestore";

export const runtime = "nodejs";

async function ensureMclpEnabled(db: Firestore, companyId: string) {
  const companyRef = db.collection("companies").doc(companyId);
  const snap = await companyRef.get();
  if (!snap.exists || !snap.data()?.feature_compliance_module_enabled) {
    throw new Error("MCLP_DISABLED");
  }
}

// POST /api/mclp/calendar/update (for updating a month)
export async function POST(req: NextRequest) {
    try {
        const { companyId, year, monthId, data } = await req.json();

        if (!companyId || !year || !monthId || !data) {
            return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
        }
        await ensureMclpEnabled(adminDb, companyId);

        
        const calendarId = `${companyId}_${year}`;
        const ref = adminDb.collection("complianceCalendars").doc(calendarId).collection("months").doc(monthId);

        const snap = await ref.get();
        if (!snap.exists || snap.data()?.editable === false) {
            throw new Error("Mes no encontrado o bloqueado para edición.");
        }
        
        await ref.update({
            corteCarga: admin.firestore.Timestamp.fromDate(new Date(data.corteCarga)),
            limiteRevision: admin.firestore.Timestamp.fromDate(new Date(data.limiteRevision)),
            fechaPago: admin.firestore.Timestamp.fromDate(new Date(data.fechaPago)),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, id: monthId });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
