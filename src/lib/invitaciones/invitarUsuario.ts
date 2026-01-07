// src/lib/invitaciones/invitarUsuario.ts

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { RolInvitado } from "@/types/pcg";

export type InvitarUsuarioParams = {
  email: string;
  empresaId: string;
  empresaNombre: string;
  roleDeseado: RolInvitado;
  creadoPorUid?: string;
};


function construirUrlInvitacion(invId: string, email: string): string {
    const rawBaseUrl = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000";
    
    if (!rawBaseUrl) {
      throw new Error("La URL base de la aplicación no está configurada en las variables de entorno.");
    }
  
    const appBaseUrl = rawBaseUrl.replace(/\/+$/, "");
    return `${appBaseUrl}/accept-invite?invId=${encodeURIComponent(invId)}&email=${encodeURIComponent(email)}`;
}


/**
 * Crea un documento de invitación en Firestore y, a través de la extensión "Trigger Email",
 * envía un correo electrónico al usuario para que se una a la empresa.
 * @param params Los datos de la invitación.
 */
export async function invitarUsuario(params: InvitarUsuarioParams): Promise<void> {
    if (!params.email || !params.empresaId || !params.roleDeseado) {
        throw new Error("El email, la empresa y el rol son obligatorios.");
    }
  
    const invitationsRef = collection(firebaseDb, "invitacionesUsuarios");
    const newInvitationRef = await addDoc(invitationsRef, {
        email: params.email.toLowerCase().trim(),
        empresaId: params.empresaId,
        empresaNombre: params.empresaNombre,
        roleDeseado: params.roleDeseado,
        estado: "pendiente",
        creadoPorUid: params.creadoPorUid || "sistema", // UID del admin que invita
        createdAt: serverTimestamp(),
    });

    const finalAcceptInviteUrl = construirUrlInvitacion(newInvitationRef.id, params.email);
    const platformUrl = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000";
    const logoUrl = `${platformUrl}/logo.png`;

    const mailRef = collection(firebaseDb, "mail");
    await addDoc(mailRef, {
        to: [params.email],
        message: {
        subject: `Invitación para unirte a ${params.empresaNombre} en PCG`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #334155;">
            <img src="${logoUrl}" alt="Logo PCG" style="max-width: 80px; margin-bottom: 24px;">
            <h2 style="font-size: 24px; color: #1e293b; margin-top: 0;">🚀 ¡Bienvenido a PCG!</h2>
            <p style="font-size: 16px; line-height: 1.5;">La empresa <strong>${params.empresaNombre}</strong> ha habilitado tu acceso a <strong>PCG</strong>, la plataforma profesional donde se centraliza y gestiona toda la información operativa, documental y estratégica de tus obras.</p>
            
            <div style="background-color: #f1f5f9; padding: 12px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0; font-size: 16px;">🎯 Tu rol asignado: <strong style="color: #4f46e5;">${params.roleDeseado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong></p>
            </div>
            
            <p style="font-size: 16px; line-height: 1.5;">Este acceso te permitirá administrar equipos, supervisar obras, gestionar avances, revisar documentación y acceder a reportes clave en tiempo real.</p>
            
            <h3 style="font-size: 20px; color: #1e293b; margin-top: 32px;">🔐 Activa tu cuenta</h3>
            <p style="font-size: 16px; line-height: 1.5;">Haz clic en el siguiente botón para acceder a tu panel personalizado y comenzar a utilizar todas las herramientas de PCG:</p>
            
            <a href="${finalAcceptInviteUrl}" style="display: inline-block; background-color: #4338ca; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0; font-weight: 600;">Activar mi cuenta y acceder a PCG</a>
            
            <p style="font-size: 14px; color: #64748b;">Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
            <p style="font-size: 12px; word-break: break-all; color: #475569;">${finalAcceptInviteUrl}</p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">

            <p style="font-size:14px;"><strong>Acceso directo a la plataforma:</strong></p>
            <p style="font-size:12px;">Puedes acceder directamente a la plataforma en cualquier momento desde esta dirección:</p>
            <p><a href="${platformUrl}">${platformUrl}</a></p>
            <p style="font-size:12px;"><strong>Sugerencia:</strong> Guarda esta dirección en tus favoritos o crea un acceso directo en tu escritorio para facilitar tu ingreso.</p>
            
            <p style="font-size: 14px; color: #64748b;">💬 Si tienes dudas o necesitas soporte, comunícate con el administrador de tu empresa.</p>
            </div>
        `,
        },
    });
}
