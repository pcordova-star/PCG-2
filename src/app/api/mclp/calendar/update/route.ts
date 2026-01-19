// src/app/api/mclp/calendar/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb, Timestamp as AdminTimestamp } from "@/server/firebaseAdmin";
import { ensureMclpEnabled } from "@/server/lib/mclp/ensureMclpEnabled";

export const runtime = "nodejs";

// POST /api/mclp/calendar/update (for updating a month)
export async function POST(req: NextRequest) {
    try {
        const { companyId, year, monthId, data } = await req.json();

        if (!companyId || !year || !monthId || !data) {
            return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
        }
        await ensureMclpEnabled(companyId);

        
        const calendarId = `${companyId}_${year}`;
        const ref = adminDb.collection("complianceCalendars").doc(calendarId).collection("months").doc(monthId);

        const snap = await ref.get();
        if (!snap.exists || snap.data()?.editable === false) {
            throw new Error("Mes no encontrado o bloqueado para edición.");
        }
        
        await ref.update({
            corteCarga: AdminTimestamp.fromDate(new Date(data.corteCarga)),
            limiteRevision: AdminTimestamp.fromDate(new Date(data.limiteRevision)),
            fechaPago: AdminTimestamp.fromDate(new Date(data.fechaPago)),
            updatedAt: adminDb.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, id: monthId });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
