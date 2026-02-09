// src/app/api/obras/notify-director/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin from "@/server/firebaseAdmin";
import { z } from "zod";

const NotifyDirectorSchema = z.object({
  obraId: z.string().min(1),
  obraNombre: z.string().min(1),
  clienteEmail: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authorization.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    const userRole = (decodedToken as any).role;
    if (!["superadmin", "admin_empresa"].includes(userRole)) {
      return NextResponse.json({ error: "Permission Denied" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = NotifyDirectorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const { obraId, obraNombre, clienteEmail } = parsed.data;

    const db = admin.firestore();
    
    const clientDashboardUrl = `${process.env.APP_BASE_URL || 'https://pcgoperacion.com'}/cliente/obras/${obraId}`;
    const loginUrl = `${process.env.APP_BASE_URL || 'https://pcgoperacion.com'}/login/cliente`;

    await db.collection("mail").add({
      to: [clienteEmail],
      message: {
        subject: `Acceso al Portal de Seguimiento de Obra: ${obraNombre}`,
        html: `
          <p>Hola,</p>
          <p>Se ha habilitado su acceso al portal de seguimiento para la obra <strong>${obraNombre}</strong> en la plataforma PCG.</p>
          <p>Puede visualizar el estado y los avances del proyecto haciendo clic en el siguiente enlace:</p>
          <p><a href="${clientDashboardUrl}" style="display: inline-block; padding: 12px 20px; background-color: #3F51B5; color: white; text-decoration: none; border-radius: 5px;">Acceder al Portal de la Obra</a></p>
          <p>Si es su primera vez ingresando, puede que necesite usar la función de "recuperar contraseña" en la página de <a href="${loginUrl}">inicio de sesión para clientes</a> si aún no ha establecido una.</p>
          <p>Saludos,<br>El equipo de PCG.</p>
        `,
      },
    });

    return NextResponse.json({ success: true, message: `Notificación enviada a ${clienteEmail}.` });

  } catch (error: any) {
    console.error("[API /notify-director] Error:", error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: "Token de autenticación expirado." }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
