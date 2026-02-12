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
    const logoUrl = `${process.env.APP_BASE_URL || 'https://pcgoperacion.com'}/logo.png`;

    await db.collection("mail").add({
      to: [clienteEmail],
      message: {
        subject: `Acceso al Portal de Seguimiento de Obra: ${obraNombre}`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #334155;">
              <img src="${logoUrl}" alt="Logo PCG" style="max-width: 80px; margin-bottom: 24px;">
              <h2 style="font-size: 24px; color: #1e293b; margin-top: 0;">Portal de Seguimiento de Obra Habilitado</h2>
              <p style="font-size: 16px; line-height: 1.5;">Hola,</p>
              <p style="font-size: 16px; line-height: 1.5;">Te informamos que se ha habilitado tu acceso al portal de seguimiento para la obra <strong>${obraNombre}</strong> en la plataforma PCG.</p>
              <p style="font-size: 16px; line-height: 1.5;">Desde este portal podrás visualizar en tiempo real el estado y los avances del proyecto.</p>
              
              <a href="${clientDashboardUrl}" style="display: inline-block; background-color: #4338ca; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0; font-weight: 600;">Acceder al Portal de la Obra</a>

              <p style="font-size: 14px; line-height: 1.5;">Si es tu primer ingreso o no recuerdas tu contraseña, puedes establecer una nueva desde la página de <a href="${loginUrl}" style="color: #4338ca;">inicio de sesión para clientes</a> usando la opción de recuperar contraseña.</p>

              <p style="font-size: 14px; color: #64748b; margin-top: 24px;">Saludos cordiales,<br>El Equipo de PCG.</p>
            </div>
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
