// src/app/api/mclp/subcontractors/invite/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin from "@/server/firebaseAdmin";
import { ensureMclpEnabled } from "@/server/lib/mclp/ensureMclpEnabled";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";

// POST /api/mclp/subcontractors/invite
export async function POST(req: NextRequest) {
  try {
    const { companyId, subcontractorId, email, nombre } = await req.json();
    if (!companyId || !subcontractorId || !email || !nombre) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }
    
    const db = admin.firestore();
    const auth = admin.auth();
    await ensureMclpEnabled(db, companyId);

    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch {
      user = await auth.createUser({ email, displayName: nombre, emailVerified: false });
    }

    await db.collection("users").doc(user.uid).set({
      uid: user.uid, email, nombre, role: "contratista", companyId, subcontractorId,
      updatedAt: Timestamp.now(),
    }, { merge: true });

    const subcontractorRef = db.collection("subcontractors").doc(subcontractorId);
    const subcontractorSnap = await subcontractorRef.get();
    const existingUserIds = subcontractorSnap.data()?.userIds || [];
    
    await subcontractorRef.update({
        userIds: Array.from(new Set([...existingUserIds, user.uid])),
        updatedAt: Timestamp.now(),
    });

    const loginUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/login/usuario`;
    const oob = await auth.generatePasswordResetLink(email, { url: loginUrl });

    await db.collection("mail").add({
        to: email,
        message: {
            subject: `Invitación al Portal de Cumplimiento`,
            html: `<p>Hola ${nombre},</p><p>Has sido invitado a unirte al portal de cumplimiento de PCG.</p><p>Para activar tu cuenta y establecer tu contraseña, haz clic en el siguiente enlace:</p><p><a href="${oob}">Activar cuenta</a></p>`,
        },
    });

    return NextResponse.json({ success: true, uid: user.uid });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
