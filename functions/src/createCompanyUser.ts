
// src/functions/src/createCompanyUser.ts
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import { getAdminApp } from "./firebaseAdmin";
import * as admin from "firebase-admin";

// Correct way is to get the initialized app instance once.
const adminApp = getAdminApp();

function buildAcceptInviteUrl(invId: string, email: string): string {
  const rawBaseUrl = functions.config().app?.base_url || "http://localhost:3000";
  const appBaseUrl = rawBaseUrl.replace(/\/+$/, "");
  return `${appBaseUrl}/accept-invite?invId=${encodeURIComponent(invId)}&email=${encodeURIComponent(email)}`;
}

export const createCompanyUser = functions.region("us-central1").https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "No autenticado.");
    }
    
    // Use the initialized admin app instance
    const auth = adminApp.auth();
    const db = adminApp.firestore();

    const requesterClaims = await auth.getUser(context.auth.uid);
    if (requesterClaims.customClaims?.role !== "superadmin") {
      throw new functions.https.HttpsError("permission-denied", "Solo SUPER_ADMIN puede crear usuarios.");
    }
    
    if (!data.companyId || !data.email || !data.nombre || !data.role) {
      throw new functions.https.HttpsError("invalid-argument", "Faltan campos obligatorios: companyId, email, nombre, role.");
    }
    
    if (!data.password || data.password.length < 6) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "La contraseña es obligatoria y debe tener al menos 6 caracteres."
        );
    }

    const companyRef = db.collection("companies").doc(data.companyId);
    const companySnap = await companyRef.get();
    if (!companySnap.exists) {
      throw new functions.https.HttpsError("not-found", "La empresa no existe.");
    }
    const companyData = companySnap.data()!;

    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: data.email,
        password: data.password,
        displayName: data.nombre,
        emailVerified: false, 
        disabled: false,
      });
      logger.info(`Usuario creado con éxito para ${data.email} con UID: ${userRecord.uid}`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        throw new functions.https.HttpsError("already-exists", "Ya existe un usuario con este correo electrónico.");
      }
      logger.error("Error creando usuario en Firebase Auth:", error);
      throw new functions.https.HttpsError("internal", "Error interno al crear el usuario en Auth.", error);
    }

    const uid = userRecord.uid;

    await auth.setCustomUserClaims(uid, {
      role: data.role,
      companyId: data.companyId,
    });

    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const userProfileRef = db.collection("users").doc(uid);
    await userProfileRef.set({
      nombre: data.nombre,
      email: data.email,
      role: data.role,
      empresaId: data.companyId,
      activo: true,
      createdAt: now,
      updatedAt: now,
      mustChangePassword: true,
    }, { merge: true });
    
    const invitationRef = db.collection("invitacionesUsuarios").doc();
    await invitationRef.set({
        email: data.email,
        empresaId: data.companyId,
        empresaNombre: companyData.nombreFantasia || companyData.razonSocial || '',
        roleDeseado: data.role,
        estado: 'pendiente_auth',
        uid: uid,
        createdAt: now,
        creadoPorUid: context.auth.uid,
    });
    
    const acceptInviteUrl = buildAcceptInviteUrl(invitationRef.id, data.email);
    
    await db.collection("mail").add({
      to: [data.email],
      message: {
        from: "PCG Operación <control@pcgoperacion.com>",
        subject: `Invitación a Plataforma de Control de Gestión – ${companyData.nombreFantasia}`,
        html: `
        <!DOCTYPE html>
        <html lang="es">
          <body style="margin:0; padding:0; background:#f5f7fa; font-family:Arial, sans-serif;">
            <table width="100%" cellspacing="0" cellpadding="0" bgcolor="#f5f7fa">
              <tr>
                <td align="center" style="padding:30px 20px;">
                  <table width="600" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius:8px; overflow:hidden; border:1px solid #e2e6eb;">

                    <tr>
                      <td align="center" style="background:#1a73e8; padding:24px 20px;">
                        <h1 style="color:white; margin:0; font-size:24px; font-weight:600;">
                          Plataforma de Control de Gestión
                        </h1>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding:32px 40px; color:#333333; font-size:16px; line-height:24px;">

                        <p style="margin-top:0;">
                          Hola ${data.nombre},
                        </p>

                        <p>
                          Has sido invitado a unirte a la plataforma
                          <strong>${companyData.nombreFantasia}</strong> en PCG.
                        </p>

                        <p>
                          Para completar tu registro, haz clic en el siguiente botón:
                        </p>

                        <p style="text-align:center; margin:32px 0;">
                          <a href="${acceptInviteUrl}"
                             style="background:#1a73e8; color:white; text-decoration:none; padding:14px 28px; border-radius:6px; font-weight:600; display:inline-block;">
                             Aceptar Invitación
                          </a>
                        </p>

                        <p>Si el botón no funciona, copia y pega este enlace:</p>

                        <p style="word-break:break-all; color:#1a73e8;">
                          ${acceptInviteUrl}
                        </p>

                        <p>
                          Este correo fue enviado a <strong>${data.email}</strong>.
                        </p>

                      </td>
                    </tr>

                    <tr>
                      <td align="center" style="background:#f0f2f5; padding:18px 20px; font-size:12px; color:#666;">
                        © 2026 PCG Operación · Todos los derechos reservados
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
        `,
      },
    });

    return {
      uid,
      email: data.email,
      nombre: data.nombre,
      role: data.role,
      companyId: data.companyId,
      message: 'Usuario creado directamente y con éxito.'
    };
});
