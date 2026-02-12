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
  subcontractorId?: string;
  subcontractorNombre?: string;
  nombre?: string;
};


function construirUrlInvitacion(invId: string, email: string): string {
    const appBaseUrl = "https://pcgoperacion.com";
    
    if (!appBaseUrl) {
      throw new Error("La URL base de la aplicación no está configurada.");
    }
  
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
        subcontractorId: params.subcontractorId || null,
        subcontractorNombre: params.subcontractorNombre || null,
        nombre: params.nombre || null,
        estado: "pendiente",
        creadoPorUid: params.creadoPorUid || "sistema", // UID del admin que invita
        createdAt: serverTimestamp(),
    });

    const finalAcceptInviteUrl = construirUrlInvitacion(newInvitationRef.id, params.email);
    const platformUrl = "https://pcgoperacion.com";
    const logoUrl = `${platformUrl}/logo.png`;

    let emailHtml;
    let emailSubject;

    if (params.roleDeseado === 'cliente') {
        emailSubject = `Invitación al Portal de Directorio de Obras: ${params.empresaNombre}`;
        emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #334155;">
              <img src="${logoUrl}" alt="Logo PCG" style="max-width: 80px; margin-bottom: 24px;">
              <h2 style="font-size: 24px; color: #1e293b; margin-top: 0;">Invitación al Portal de Directorio de Obras</h2>
              <p style="font-size: 16px; line-height: 1.5;">Estimado/a ${params.nombre || 'Director'},</p>
              <p style="font-size: 16px; line-height: 1.5;">En nombre de <strong>${params.empresaNombre}</strong>, le extendemos una invitación para acceder a su portal de seguimiento de obras en la plataforma <strong>PCG (Plataforma de Control y Gestión)</strong>.</p>
              <p style="font-size: 16px; line-height: 1.5;">PCG es el sistema centralizado que utiliza ${params.empresaNombre} para gestionar la información operativa, contractual y financiera de sus proyectos, asegurando transparencia y trazabilidad en tiempo real.</p>
              
              <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #4f46e5;">
                <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #1e293b;">Su Portal de Directorio</h3>
                <p style="margin: 0; font-size: 16px;">Desde su panel personalizado, podrá:</p>
                <ul style="padding-left: 20px; margin-top: 8px; font-size: 16px;">
                    <li>Visualizar el avance físico y financiero de sus obras asignadas.</li>
                    <li>Acceder a reportes fotográficos y comentarios de terreno.</li>
                    <li>Consultar indicadores clave de rendimiento (KPIs) del proyecto.</li>
                </ul>
              </div>
              
              <h3 style="font-size: 20px; color: #1e293b; margin-top: 32px;">🔐 Active su Acceso Seguro</h3>
              <p style="font-size: 16px; line-height: 1.5;">Para activar su cuenta y establecer su contraseña personal, por favor, haga clic en el siguiente botón:</p>
              
              <a href="${finalAcceptInviteUrl}" style="display: inline-block; background-color: #4338ca; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0; font-weight: 600;">Activar Cuenta y Acceder al Portal</a>
              
              <p style="font-size: 14px; color: #64748b;">Si el botón no funciona, copie y pegue el siguiente enlace en su navegador:</p>
              <p style="font-size: 12px; word-break: break-all; color: #475569;">${finalAcceptInviteUrl}</p>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
              
              <p style="font-size: 12px; color: #64748b;">Este es un correo automático generado por la plataforma PCG. Para cualquier consulta sobre el proyecto, por favor, contacte directamente con el equipo de ${params.empresaNombre}.</p>
            </div>
        `;
    } else {
        emailSubject = `Invitación para unirte a ${params.empresaNombre} en PCG`;
        emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #334155;">
              <img src="${logoUrl}" alt="Logo PCG" style="max-width: 80px; margin-bottom: 24px;">
              <h2 style="font-size: 24px; color: #1e293b; margin-top: 0;">🚀 ¡Bienvenido al equipo en PCG!</h2>
              <p style="font-size: 16px; line-height: 1.5;">La empresa <strong>${params.empresaNombre}</strong> te ha invitado a unirte a su espacio de trabajo en <strong>PCG</strong>, la plataforma profesional donde se centraliza y gestiona toda la información operativa, documental y estratégica de las obras.</p>
              
              <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 24px 0;">
                  <p style="margin: 0; font-size: 16px;">🎯 Tu rol asignado es: <strong style="color: #4f46e5;">${params.roleDeseado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong></p>
              </div>
              
              <p style="font-size: 16px; line-height: 1.5;">Este acceso te permitirá administrar equipos, supervisar obras, gestionar avances, revisar documentación y acceder a reportes clave en tiempo real, según los permisos de tu rol.</p>
              
              <h3 style="font-size: 20px; color: #1e293b; margin-top: 32px;">🔐 Activa tu cuenta</h3>
              <p style="font-size: 16px; line-height: 1.5;">Para activar tu cuenta y establecer tu contraseña personal, haz clic en el siguiente botón:</p>
              
              <a href="${finalAcceptInviteUrl}" style="display: inline-block; background-color: #4338ca; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0; font-weight: 600;">Activar mi cuenta y acceder a PCG</a>
              
              <p style="font-size: 14px; color: #64748b;">Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
              <p style="font-size: 12px; word-break: break-all; color: #475569;">${finalAcceptInviteUrl}</p>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
              
              <p style="font-size: 12px; color: #64748b;">Este es un correo automático. Para cualquier consulta, por favor, contacta al administrador de tu empresa en la plataforma.</p>
            </div>
        `;
    }

    await addDoc(collection(firebaseDb, "mail"), {
        to: [params.email],
        message: {
            subject: emailSubject,
            html: emailHtml,
        },
    });
}
