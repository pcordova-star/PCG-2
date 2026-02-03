// src/app/api/mclp/calendar/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb, Timestamp as AdminTimestamp } from "@/server/firebaseAdmin";
import { ensureMclpEnabled } from "@/server/lib/mclp/ensureMclpEnabled";

export const runtime = "nodejs";

// POST /api/mclp/calendar/update (para actualizar un período)
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
        
        const { companyId, periodId, data } = await req.json();

        if (!companyId || !periodId || !data) {
            return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
        }

        const allowedWriteRoles = ['superadmin', 'admin_empresa'];
        if (!allowedWriteRoles.includes(userRole)) {
            return NextResponse.json({ error: "Permission Denied: Insufficient role for write operation." }, { status: 403 });
        }
        if (userRole !== 'superadmin' && userCompanyId !== companyId) {
            return NextResponse.json({ error: "Permission Denied: User does not belong to the requested company." }, { status: 403 });
        }
        
        await ensureMclpEnabled(companyId);
        
        const ref = adminDb.collection("compliancePeriods").doc(periodId);
        
        const snap = await ref.get();
        if (!snap.exists) {
            throw new Error("Período no encontrado.");
        }
        // Opcional: añadir lógica para no editar períodos cerrados
        // if (snap.data()?.estado === 'Cerrado') {
        //     throw new Error("No se puede editar un período que ya está cerrado.");
        // }
        
        await ref.update({
            nombre: data.nombre,
            corteCarga: AdminTimestamp.fromDate(new Date(data.corteCarga)),
            limiteRevision: AdminTimestamp.fromDate(new Date(data.limiteRevision)),
            fechaPago: AdminTimestamp.fromDate(new Date(data.fechaPago)),
            updatedAt: adminDb.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, id: periodId });

    } catch (error: any) {
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: "Token de autenticación inválido o expirado." }, { status: 401 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
