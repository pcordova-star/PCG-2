// src/app/api/mclp/subcontractors/invite/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/server/firebaseAdmin";
import { ensureMclpEnabled } from "@/server/lib/mclp/ensureMclpEnabled";

export const runtime = "nodejs";

// POST /api/mclp/subcontractors/invite
export async function POST(req: NextRequest) {
  try {
    const { companyId, subcontractorId, email, nombre, password } = await req.json();
    if (!companyId || !subcontractorId || !email || !nombre || !password) {
      return NextResponse.json({ error: "Faltan parámetros requeridos (incluyendo contraseña)" }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }
    
    const auth = admin.auth();
    await ensureMclpEnabled(companyId);

    let user;
    try {
      user = await auth.getUserByEmail(email);
       return NextResponse.json({ error: "Ya existe un usuario con este correo electrónico." }, { status: 409 });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // El usuario no existe, se puede crear.
        user = await auth.createUser({ email, password, displayName: nombre, emailVerified: false });
      } else {
        // Otro error, lo relanzamos
        throw error;
      }
    }

    await adminDb.collection("users").doc(user.uid).set({
      uid: user.uid, email, nombre, role: "contratista", companyId, subcontractorId,
      activo: true,
      mustChangePassword: true, // Forzar cambio de contraseña en el primer login
      updatedAt: admin.firestore.Timestamp.now(),
    }, { merge: true });

    const subcontractorRef = adminDb.collection("subcontractors").doc(subcontractorId);
    const subcontractorSnap = await subcontractorRef.get();
    const subcontractorData = subcontractorSnap.data();
    const existingUserIds = subcontractorData?.userIds || [];
    
    await subcontractorRef.update({
        userIds: Array.from(new Set([...existingUserIds, user.uid])),
        updatedAt: admin.firestore.Timestamp.now(),
    });

    const loginUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/login/usuario`;

    await adminDb.collection("mail").add({
        to: email,
        message: {
            subject: `Invitación al Portal de Cumplimiento de PCG`,
            html: `
              <p>Hola ${nombre},</p>
              <p>Has sido invitado a unirte al portal de cumplimiento de PCG para la empresa <strong>${subcontractorData?.razonSocial || 'subcontratista'}</strong>.</p>
              <p>Puedes iniciar sesión con tu correo y la contraseña temporal proporcionada por tu administrador.</p>
              <p><strong>Por seguridad, se te pedirá que cambies tu contraseña en tu primer acceso.</strong></p>
              <p><a href="${loginUrl}">Iniciar Sesión en PCG</a></p>
            `,
        },
    });

    return NextResponse.json({ success: true, uid: user.uid });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
