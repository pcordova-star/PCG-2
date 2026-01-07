// src/app/api/mclp/requirements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin"; // Safe to use here
import { Timestamp } from "firebase-admin/firestore";
import { RequisitoDocumento } from "@/types/pcg";

async function ensureMclpEnabled(companyId: string) {
    const db = getAdminDb();
    const snap = await db.collection("companies").doc(companyId).get();
    if (!snap.exists() || !snap.data()?.feature_compliance_module_enabled) {
        throw new Error("El Módulo de Cumplimiento Legal no está habilitado para esta empresa.");
    }
}

// GET /api/mclp/requirements?companyId=[ID]
export async function GET(req: NextRequest) {
    try {
        const companyId = req.nextUrl.searchParams.get("companyId");
        if (!companyId) {
            return NextResponse.json({ error: "companyId es requerido" }, { status: 400 });
        }
        await ensureMclpEnabled(companyId);

        const db = getAdminDb();
        const snap = await db
            .collection("compliancePrograms").doc(companyId)
            .collection("requirements").where("activo", "==", true).get();
            
        const requirements = snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                ...data,
                createdAt: (data.createdAt as Timestamp)?.toDate().toISOString(),
                updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString(),
            } as RequisitoDocumento;
        });

        return NextResponse.json(requirements);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/mclp/requirements
export async function POST(req: NextRequest) {
    try {
        const { companyId, requirement } = await req.json();
        if (!companyId || !requirement) {
            return NextResponse.json({ error: "companyId y requirement son requeridos" }, { status: 400 });
        }
        await ensureMclpEnabled(companyId);

        const db = getAdminDb();
        const ref = db.collection("compliancePrograms").doc(companyId).collection("requirements").doc();
        await ref.set({
            ...requirement,
            activo: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });

        return NextResponse.json({ id: ref.id });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/mclp/requirements
export async function PUT(req: NextRequest) {
    try {
        const { companyId, requirement } = await req.json();
        if (!companyId || !requirement || !requirement.id) {
            return NextResponse.json({ error: "companyId y requirement con ID son requeridos" }, { status: 400 });
        }
        await ensureMclpEnabled(companyId);
        
        const { id, ...dataToUpdate } = requirement;

        const db = getAdminDb();
        const ref = db.collection("compliancePrograms").doc(companyId).collection("requirements").doc(id);
        await ref.update({
            ...dataToUpdate,
            updatedAt: Timestamp.now(),
        });

        return NextResponse.json({ id });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
