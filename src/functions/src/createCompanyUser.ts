// functions/src/createCompanyUser.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

function buildAcceptInviteUrl(invId: string, email: string): string {
  const rawBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  if (!rawBaseUrl) {
    logger.error("CRÍTICO: APP_BASE_URL no está configurada. No se puede crear un enlace de invitación válido.");
    throw new HttpsError("internal", "El servidor no está configurado para enviar invitaciones.");
  }
  const appBaseUrl = rawBaseUrl.replace(/\/+$/, "");
  return `${appBaseUrl}/accept-invite?invId=${encodeURIComponent(invId)}&email=${encodeURIComponent(email)}`;
}

export const createCompanyUser = onCall(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "No autenticado.");
    }
    
    const auth = admin.auth();
    const db = admin.firestore();

    const requesterClaims = await auth.getUser(request.auth.uid);
    if (requesterClaims.customClaims?.role !== "superadmin") {
      throw new HttpsError("permission-denied", "Solo SUPER_ADMIN puede crear usuarios.");
    }
    
    const data = request.data as {
      companyId: string;
      email: string;
      nombre: string;
      role: "admin_empresa" | "jefe_obra" | "prevencionista" | "cliente";
      password?: string;
    };

    if (!data.companyId || !data.email || !data.nombre || !data.role) {
      throw new HttpsError("invalid-argument", "Faltan campos obligatorios: companyId, email, nombre, role.");
    }
    
    if (!data.password || data.password.length < 6) {
        throw new HttpsError(
            "invalid-argument",
            "La contraseña es obligatoria y debe tener al menos 6 caracteres."
        );
    }

    const companyRef = db.collection("companies").doc(data.companyId);
    const companySnap = await companyRef.get();
    if (!companySnap.exists) {
      throw new HttpsError("not-found", "La empresa no existe.");
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
        throw new HttpsError("already-exists", "Ya existe un usuario con este correo electrónico.");
      }
      logger.error("Error creando usuario en Firebase Auth:", error);
      throw new HttpsError("internal", "Error interno al crear el usuario en Auth.", error);
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
        creadoPorUid: request.auth.uid,
    });
    
    const acceptInviteUrl = buildAcceptInviteUrl(invitationRef.id, data.email);
    
    await db.collection("mail").add({
      to: [data.email],
      message: {
        subject: `Bienvenido a PCG - Acceso para ${companyData.nombreFantasia}`,
        html: `
            <p>Hola ${data.nombre},</p>
            <p>Has sido registrado en la plataforma PCG para la empresa <strong>${companyData.nombreFantasia}</strong>.</p>
            <p>Tu rol asignado es: <strong>${data.role}</strong>.</p>
            <p>Tu contraseña temporal es: <strong>${data.password}</strong></p>
            <p>Para completar tu registro y acceder, haz clic en el siguiente enlace. Se te pedirá que establezcas una nueva contraseña por seguridad.</p>
            <p><a href="${acceptInviteUrl}">Activar mi cuenta y acceder a PCG</a></p>
            <p>Si el botón no funciona, copia y pega esta URL en tu navegador:</p>
            <p><a href="${acceptInviteUrl}">${acceptInviteUrl}</a></p>
            <p>Gracias,<br>El equipo de PCG</p>`,
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
