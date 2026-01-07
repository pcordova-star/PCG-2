// src/app/api/mclp/calendar/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/server/firebaseAdmin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

async function ensureMclpEnabled(db: FirebaseFirestore.Firestore, companyId: string) {
  const companyRef = db.collection("companies").doc(companyId);
  const snap = await companyRef.get();
  if (!snap.exists() || !snap.data()?.feature_compliance_module_enabled) {
    throw new Error("MCLP_DISABLED");
  }
}

// POST /api/mclp/calendar/update (for updating a month)
export async function POST(req: NextRequest) {
    try {
        const { companyId, year, monthId, data } = await req.json();
        const db = getAdminDb();

        if (!companyId || !year || !monthId || !data) {
            return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
        }
        await ensureMclpEnabled(db, companyId);

        
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
