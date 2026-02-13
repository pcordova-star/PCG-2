// src/app/api/obras/request-director-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin from "@/server/firebaseAdmin";
import { z } from "zod";

const RequestDirectorAccessSchema = z.object({
  obraId: z.string().min(1),
  obraNombre: z.string().min(1),
  directorEmail: z.string().email(),
  empresaId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authorization.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    const { uid, name, email } = decodedToken;
    const userRole = (decodedToken as any).role;
    
    // Solo admins de empresa o jefes de obra pueden solicitar
    if (!["superadmin", "admin_empresa", "jefe_obra"].includes(userRole)) {
      return NextResponse.json({ error: "Permission Denied" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = RequestDirectorAccessSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const { obraId, obraNombre, directorEmail, empresaId } = parsed.data;
    const db = admin.firestore();

    // 1. Crear el documento de solicitud de acceso
    const requestRef = await db.collection("userAccessRequests").add({
      type: 'director_access',
      status: 'pending',
      obraId,
      obraNombre,
      directorEmail,
      empresaId, // Usar 'empresaId' para consistencia
      solicitante: {
        uid,
        nombre: name || email,
        email,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // 2. Notificar al Superadministrador
    const SUPERADMIN_EMAIL = "pauloandrescordova@gmail.com";
    const adminUrl = `${process.env.APP_BASE_URL || 'https://pcgoperacion.com'}/admin/solicitudes`;

    await db.collection("mail").add({
      to: [SUPERADMIN_EMAIL],
      message: {
        subject: `PCG: Nueva Solicitud de Acceso para Director`,
        html: `
          <p>Se ha recibido una nueva solicitud para crear una cuenta de Director:</p>
          <ul>
            <li><strong>Obra:</strong> ${obraNombre}</li>
            <li><strong>Email Director:</strong> ${directorEmail}</li>
            <li><strong>Solicitado por:</strong> ${name || email}</li>
          </ul>
          <p>Por favor, revisa la solicitud y crea la cuenta de usuario desde el panel de administración.</p>
          <p><a href="${adminUrl}">Ir al Panel de Solicitudes</a></p>
        `,
      },
    });

    return NextResponse.json({ success: true, message: "Solicitud de acceso registrada y notificada al administrador.", requestId: requestRef.id });

  } catch (error: any) {
    console.error("[API /request-director-access] Error:", error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: "Token de autenticación expirado." }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor al procesar la solicitud." }, { status: 500 });
  }
}

    