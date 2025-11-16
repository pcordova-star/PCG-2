import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { RolInvitado } from "@/types/pcg";

export async function invitarUsuario({
  email,
  empresaId,
  empresaNombre,
  roleDeseado,
}: {
  email: string;
  empresaId: string;
  empresaNombre: string;
  roleDeseado: RolInvitado;
}) {
  const emailLower = email.trim().toLowerCase();

  const invitacionRef = await addDoc(collection(firebaseDb, "invitacionesUsuarios"), {
    email: emailLower,
    empresaId,
    empresaNombre,
    roleDeseado,
    estado: "pendiente",
    createdAt: serverTimestamp(),
  });

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:9002/login";
  const baseUrl = appUrl.replace(/\/+$/, "");
  const logoUrl = `${baseUrl}/logo.png`;
  const url = appUrl;
  const invitationId = invitacionRef.id;

  const subject = `Has sido invitado a PCG – La nueva forma de gestionar obras`;

  const text = `Hola,

Has sido invitado a unirte a PCG por la empresa ${empresaNombre}.

PCG es una plataforma diseñada para gestionar la obra de forma simple, segura y trazable.
Incluye:

📅 Planificación y seguimiento de obra
📊 Control de presupuesto y avances
🦺 Prevención de riesgos e IPER digital
📁 …entre otros módulos clave para la operación diaria.

Tu rol asignado: ${roleDeseado}

Para ingresar, usa este enlace:
${url}

Código de invitación: ${invitationId}

Bienvenido a PCG.`;

  const html = `<div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#222; line-height:1.5;">
  <div style="text-align:center; margin-bottom:16px;">
    <img src="${logoUrl}" alt="PCG - Plataforma de Control y Gestión" style="max-width:160px; height:auto; margin-bottom:8px;" />
  </div>

  <p>Hola,</p>

  <p>
    Has sido invitado a unirte a <strong>PCG</strong> por la empresa 
    <strong>${empresaNombre}</strong>.
  </p>

  <p style="font-size:15px;">
    PCG es una plataforma creada para que la gestión de obras sea más 
    <strong>simple, segura y completamente trazable</strong>. Con ella podrás acceder a:
  </p>

  <ul style="padding-left:20px; font-size:15px; line-height:1.6; margin:0 0 12px 0;">
    <li>📅 <strong>Planificación y seguimiento de obra</strong></li>
    <li>📊 <strong>Control de presupuesto y avances</strong></li>
    <li>🦺 <strong>Prevención de riesgos e IPER digital</strong></li>
    <li>📁 <strong>…entre otros módulos clave para la operación diaria.</strong></li>
  </ul>

  <p style="font-size:15px;">
    Tu rol asignado: <strong>${roleDeseado}</strong>
  </p>

  <p style="margin-top:12px;">
    Para activar tu acceso, ingresa con este correo en el siguiente enlace:
  </p>

  <p style="margin:16px 0;">
    <a href="${url}" 
       style="background:#1e88e5; color:white; padding:12px 22px; 
              border-radius:6px; text-decoration:none; font-weight:bold; display:inline-block;">
      Entrar a PCG
    </a>
  </p>

  <p style="font-size:14px; margin-top:12px; color:#555;">
    Código de invitación: <strong>${invitationId}</strong>
  </p>

  <p style="font-size:14px; margin-top:20px; color:#777;">
    Bienvenido a una nueva forma de gestionar la construcción.
  </p>
</div>`;

  await addDoc(collection(firebaseDb, "mail"), {
    to: [emailLower],
    message: {
      subject,
      text,
      html,
    },
  });
}
