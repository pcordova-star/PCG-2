// src/lib/mclp/subcontractors/inviteContractor.ts
import { getAuth } from "firebase-admin/auth";
import { getAdminDb } from "@/lib/firebaseAdmin";
import * as admin from 'firebase-admin';

export async function inviteContractor(params: {
  subcontractorId: string;
  companyId: string;
  email: string;
  nombre: string;
}) {
  const auth = getAuth();
  const db = getAdminDb();

  const user = await auth.createUser({
    email: params.email,
    displayName: params.nombre,
  });

  await db.collection("users").doc(user.uid).set({
    role: "contratista",
    companyId: params.companyId,
    subcontractorId: params.subcontractorId,
    createdAt: new Date(),
  });

  await db.collection("subcontractors")
    .doc(params.subcontractorId)
    .update({
      userIds: admin.firestore.FieldValue.arrayUnion(user.uid),
    });

  // Generar link de activación de cuenta (restablecimiento de contraseña)
  const actionCodeSettings = {
    url: `${process.env.NEXT_PUBLIC_APP_BASE_URL || 'https://www.pcgoperacion.com'}/login/usuario`,
    handleCodeInApp: false,
  };
  const link = await auth.generatePasswordResetLink(params.email, actionCodeSettings);

  const companyDoc = await db.collection('companies').doc(params.companyId).get();
  const companyName = companyDoc.data()?.nombreFantasia || 'la empresa';

  // Enviar correo directamente con HTML, sin usar plantilla.
  await db.collection("mail").add({
    to: params.email,
    message: {
        subject: `Invitación al Portal de Cumplimiento de ${companyName}`,
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Invitación al Portal de Cumplimiento Legal</h2>
                <p>Hola ${params.nombre},</p>
                <p>Has sido invitado a unirte al portal de cumplimiento de <strong>${companyName}</strong> en la plataforma PCG.</p>
                <p>Para activar tu cuenta y acceder al portal, por favor haz clic en el siguiente botón para establecer tu contraseña:</p>
                <a href="${link}" style="display: inline-block; padding: 12px 20px; margin: 15px 0; font-size: 16px; color: white; background-color: #007bff; text-decoration: none; border-radius: 5px;">
                    Activar Cuenta y Definir Contraseña
                </a>
                <p>Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
                <p><a href="${link}">${link}</a></p>
                <p>Una vez que hayas establecido tu contraseña, podrás iniciar sesión en la plataforma.</p>
                <br>
                <p>Saludos,</p>
                <p>El equipo de ${companyName}</p>
            </div>
        `,
    },
  });
}
