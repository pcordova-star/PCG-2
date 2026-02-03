// src/app/api/mclp/requirements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { RequisitoDocumento } from "@/types/pcg";
import admin, { adminDb, FieldValue, Timestamp } from "@/server/firebaseAdmin";
import { ensureMclpEnabled } from "@/server/lib/mclp/ensureMclpEnabled";

export const runtime = "nodejs";


// GET /api/mclp/requirements?companyId=[ID]
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

        const allowedReadRoles = ['superadmin', 'admin_empresa', 'jefe_obra'];
        if (!allowedReadRoles.includes(userRole)) {
            return NextResponse.json({ error: "Permission Denied: Insufficient role." }, { status: 403 });
        }
        if (userRole !== 'superadmin' && userCompanyId !== companyId) {
            return NextResponse.json({ error: "Permission Denied: User does not belong to the requested company." }, { status: 403 });
        }

        await ensureMclpEnabled(companyId);

        const snap = await adminDb
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
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: "Token de autenticación inválido o expirado." }, { status: 401 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/mclp/requirements
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

        const { companyId, requirement } = await req.json();
        
        if (!companyId || !requirement) {
            return NextResponse.json({ error: "companyId y requirement son requeridos" }, { status: 400 });
        }

        const allowedWriteRoles = ['superadmin', 'admin_empresa'];
        if (!allowedWriteRoles.includes(userRole)) {
            return NextResponse.json({ error: "Permission Denied: Insufficient role for write operation." }, { status: 403 });
        }
        if (userRole !== 'superadmin' && userCompanyId !== companyId) {
            return NextResponse.json({ error: "Permission Denied: User does not belong to the requested company." }, { status: 403 });
        }

        await ensureMclpEnabled(companyId);

        
        const ref = adminDb.collection("compliancePrograms").doc(companyId).collection("requirements").doc();
        await ref.set({
            ...requirement,
            activo: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ id: ref.id });

    } catch (error: any) {
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: "Token de autenticación inválido o expirado." }, { status: 401 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/mclp/requirements
export async function PUT(req: NextRequest) {
    try {
        const authorization = req.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authorization.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);

        const userRole = (decodedToken as any).role;
        const userCompanyId = (decodedToken as any).companyId;

        const { companyId, requirement } = await req.json();

        if (!companyId || !requirement || !requirement.id) {
            return NextResponse.json({ error: "companyId y requirement con ID son requeridos" }, { status: 400 });
        }

        const allowedWriteRoles = ['superadmin', 'admin_empresa'];
        if (!allowedWriteRoles.includes(userRole)) {
            return NextResponse.json({ error: "Permission Denied: Insufficient role for write operation." }, { status: 403 });
        }
        if (userRole !== 'superadmin' && userCompanyId !== companyId) {
            return NextResponse.json({ error: "Permission Denied: User does not belong to the requested company." }, { status: 403 });
        }
        
        await ensureMclpEnabled(companyId);
        
        const { id, ...dataToUpdate } = requirement;

        const ref = adminDb.collection("compliancePrograms").doc(companyId).collection("requirements").doc(id);
        await ref.update({
            ...dataToUpdate,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ id });

    } catch (error: any) {
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: "Token de autenticación inválido o expirado." }, { status: 401 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
