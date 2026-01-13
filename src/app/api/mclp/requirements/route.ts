// src/app/api/mclp/requirements/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { Firestore, Timestamp } from "firebase-admin/firestore";
import { RequisitoDocumento } from "@/types/pcg";
import { getAdminApp } from "@/server/firebaseAdmin";

export const runtime = "nodejs";

async function ensureMclpEnabled(db: Firestore, companyId: string) {
  const companyRef = db.collection("companies").doc(companyId);
  const snap = await companyRef.get();
  if (!snap.exists || !snap.data()?.feature_compliance_module_enabled) {
    throw new Error("MCLP_DISABLED");
  }
}

// GET /api/mclp/requirements?companyId=[ID]
export async function GET(req: NextRequest) {
    try {
        const companyId = req.nextUrl.searchParams.get("companyId");
        const admin = getAdminApp();
        const db = admin.firestore();

        if (!companyId) {
            return NextResponse.json({ error: "companyId es requerido" }, { status: 400 });
        }
        await ensureMclpEnabled(db, companyId);

        const snap = await db
            .collection("compliancePrograms").doc(companyId)
            .collection("requirements").where("activo", "==", true).get();
            
        const requirements = snap.docs.map(d => {
            const data = d.data();
            const createdAt = data.createdAt as Timestamp | undefined;
            const updatedAt = data.updatedAt as Timestamp | undefined;
            return {
                id: d.id,
                ...data,
                createdAt: createdAt?.toDate().toISOString(),
                updatedAt: updatedAt?.toDate().toISOString(),
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
        const admin = getAdminApp();
        const db = admin.firestore();
        const { Timestamp } = await import("firebase-admin/firestore");

        if (!companyId || !requirement) {
            return NextResponse.json({ error: "companyId y requirement son requeridos" }, { status: 400 });
        }
        await ensureMclpEnabled(db, companyId);

        
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
        const admin = getAdminApp();
        const db = admin.firestore();
        const { Timestamp } = await import("firebase-admin/firestore");


        if (!companyId || !requirement || !requirement.id) {
            return NextResponse.json({ error: "companyId y requirement con ID son requeridos" }, { status: 400 });
        }
        await ensureMclpEnabled(db, companyId);
        
        const { id, ...dataToUpdate } = requirement;

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
