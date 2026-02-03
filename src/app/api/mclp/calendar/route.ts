// src/app/api/mclp/calendar/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb, Timestamp as AdminTimestamp } from "@/server/firebaseAdmin";
import { ensureMclpEnabled } from "@/server/lib/mclp/ensureMclpEnabled";

export const runtime = "nodejs";

// GET /api/mclp/calendar?companyId=[ID]
export async function GET(req: NextRequest) {
    try {
        const authorization = req.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authorization.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);

        const userRole = (decodedToken as any).role;
        const userCompanyId = (decodedToken as any).companyId;

        const companyId = req.nextUrl.searchParams.get("companyId");
        
        if (!companyId) {
            return NextResponse.json({ error: "companyId es requerido" }, { status: 400 });
        }

        const allowedReadRoles = ['superadmin', 'admin_empresa', 'jefe_obra', 'contratista', 'revisor_cumplimiento'];
        if (!allowedReadRoles.includes(userRole)) {
            return NextResponse.json({ error: "Permission Denied: Insufficient role." }, { status: 403 });
        }
        if (userRole !== 'superadmin' && userCompanyId !== companyId) {
             return NextResponse.json({ error: "Permission Denied: User does not belong to the requested company." }, { status: 403 });
        }

        await ensureMclpEnabled(companyId);

        const periodsSnap = await adminDb.collection("compliancePeriods")
            .where("companyId", "==", companyId)
            .orderBy("fechaPago", "desc")
            .get();
        
        const periods = periodsSnap.docs.map(d => {
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

        return NextResponse.json(periods);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/mclp/calendar (para crear un nuevo período)
export async function POST(req: NextRequest) {
    try {
        const authorization = req.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authorization.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        const userRole = (decodedToken as any).role;
        const userCompanyId = (decodedToken as any).companyId;

        const { companyId, ...data } = await req.json();

        if (!companyId || !data.nombre || !data.corteCarga || !data.limiteRevision || !data.fechaPago) {
            return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
        }

        const allowedRoles = ['superadmin', 'admin_empresa'];
        if (!allowedRoles.includes(userRole)) {
            return NextResponse.json({ error: "Permission Denied" }, { status: 403 });
        }
        if (userRole !== 'superadmin' && userCompanyId !== companyId) {
            return NextResponse.json({ error: "Permission Denied" }, { status: 403 });
        }

        await ensureMclpEnabled(companyId);
        
        const newPeriodRef = adminDb.collection("compliancePeriods").doc();
        await newPeriodRef.set({
            companyId: companyId,
            nombre: data.nombre,
            corteCarga: AdminTimestamp.fromDate(new Date(data.corteCarga)),
            limiteRevision: AdminTimestamp.fromDate(new Date(data.limiteRevision)),
            fechaPago: AdminTimestamp.fromDate(new Date(data.fechaPago)),
            estado: "Abierto para Carga",
            createdAt: adminDb.FieldValue.serverTimestamp(),
            updatedAt: adminDb.FieldValue.serverTimestamp(),
        });
        
        return NextResponse.json({ success: true, id: newPeriodRef.id });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
