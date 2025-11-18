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

  // La extensión de Firebase "Trigger Email" debería estar escuchando la colección 'mail'.
  // Al crear un documento aquí, se disparará el envío del correo.
  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://pcg2-0--pcg-2-8bf1b.us-central1.hosted.app").replace(/\/+$/, "");
  const acceptInviteUrl = `${appBaseUrl}/accept-invite?invId=${newInvitationRef.id}&email=${encodeURIComponent(params.email)}`;
  const logoUrl = `${appBaseUrl}/logo.png`;


  const mailRef = collection(firebaseDb, "mail");
  await addDoc(mailRef, {
    to: [params.email],
    message: {
      subject: `Invitación para unirte a ${params.empresaNombre} en PCG`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <img src="${logoUrl}" alt="Logo PCG" style="max-width: 100px; margin-bottom: 20px;">
          <h2 style="color: #3F51B5;">¡Hola!</h2>
          <p>Has sido invitado a unirte a la empresa <strong>${params.empresaNombre}</strong> en la plataforma de control y gestión de obras PCG.</p>
          <p>Tu rol asignado será: <strong>${params.roleDeseado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>.</p>
          <p>Para aceptar la invitación y crear tu cuenta, por favor haz clic en el siguiente botón:</p>
          <a href="${acceptInviteUrl}" style="display: inline-block; background-color: #7E57C2; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Activar mi cuenta y acceder a PCG</a>
          <p>Si el botón no funciona, copia y pega esta URL en tu navegador:</p>
          <p style="font-size: 12px; word-break: break-all;">${acceptInviteUrl}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 11px; color: #888;">Si no esperabas esta invitación, puedes ignorar este correo.</p>
        </div>
      `,
    },
  });
}
