// src/app/api/mclp/submissions/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb, Timestamp } from "@/server/firebaseAdmin";
import { ensureMclpEnabled } from "@/server/lib/mclp/ensureMclpEnabled";

export const runtime = "nodejs";

// GET /api/mclp/submissions?companyId=[ID]&periodId=[ID]&subcontractorId=[ID]
export async function GET(req: NextRequest) {
    try {
        const authorization = req.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authorization.split("Bearer ")[1];
        await admin.auth().verifyIdToken(token);

        const companyId = req.nextUrl.searchParams.get("companyId");
        const periodId = req.nextUrl.searchParams.get("periodId");
        const subcontractorId = req.nextUrl.searchParams.get("subcontractorId");
        
        if (!companyId || !periodId) {
            return NextResponse.json({ error: "companyId y periodId son requeridos" }, { status: 400 });
        }
        await ensureMclpEnabled(companyId);
        
        
        let q: admin.firestore.Query<admin.firestore.DocumentData> = adminDb
            .collection("compliancePeriods")
            .doc(periodId)
            .collection("submissions");

        if (subcontractorId) {
            q = q.where("subcontractorId", "==", subcontractorId);
        }

        const snap = await q.get();
        const data = snap.docs.map(d => {
            const docData = d.data();
            return { 
                id: d.id, 
                ...docData,
                fechaCarga: (docData.fechaCarga as Timestamp)?.toDate().toISOString(),
                // Serializa otros Timestamps si los hay
            };
        });
        
        return NextResponse.json(data);

    } catch (error: any) {
        if (error.message.includes('MCLP_DISABLED')) {
            return NextResponse.json({ error: "El módulo de cumplimiento no está habilitado para esta empresa." }, { status: 403 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
