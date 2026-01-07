
// functions/src/createCompanyUser.ts
import * as functions from 'firebase-functions';
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

function buildAcceptInviteUrl(invId: string, email: string): string {
    const rawBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    
    if (!rawBaseUrl) {
        logger.error("CRÍTICO: APP_BASE_URL no está configurada en las variables de entorno de la función. No se puede crear un enlace de invitación válido.");
        throw new functions.https.HttpsError("internal", "El servidor no está configurado correctamente para enviar invitaciones.");
    }
  
    const appBaseUrl = rawBaseUrl.replace(/\/+$/, "");
    return `${appBaseUrl}/accept-invite?invId=${encodeURIComponent(invId)}&email=${encodeURIComponent(email)}`;
}

export const createCompanyUser = functions
  .region("southamerica-west1")
  .https.onCall(async (data, context) => {
    
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "No autenticado.");
    }
    
    const auth = admin.auth();
    const db = admin.firestore();

    const requesterClaims = await auth.getUser(context.auth.uid);
    if (requesterClaims.customClaims?.role !== "superadmin") {
      throw new functions.https.HttpsError("permission-denied", "Solo SUPER_ADMIN puede crear usuarios.");
    }
    
    const { companyId, email, nombre, role, password } = data as {
      companyId: string;
      email: string;
      nombre: string;
      role: "admin_empresa" | "jefe_obra" | "prevencionista" | "cliente";
      password?: string;
    };

    if (!companyId || !email || !nombre || !role) {
      throw new functions.https.HttpsError("invalid-argument", "Faltan campos obligatorios: companyId, email, nombre, role.");
    }
    
    if (!password || password.length < 6) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "La contraseña es obligatoria y debe tener al menos 6 caracteres."
        );
    }

    const companyRef = db.collection("companies").doc(companyId);
    const companySnap = await companyRef.get();
    if (!companySnap.exists) {
      throw new functions.https.HttpsError("not-found", "La empresa no existe.");
    }
    const companyData = companySnap.data()!;


    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: nombre,
        emailVerified: false, 
        disabled: false,
      });
      logger.info(`Usuario creado con éxito para ${email} con UID: ${userRecord.uid}`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        throw new functions.https.HttpsError("already-exists", "Ya existe un usuario con este correo electrónico.");
      }
      logger.error("Error creando usuario en Firebase Auth:", error);
      throw new functions.https.HttpsError("internal", "Error interno al crear el usuario en Auth.", error);
    }

    const uid = userRecord.uid;

    await auth.setCustomUserClaims(uid, {
      role: role,
      companyId: companyId,
    });

    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const userProfileRef = db.collection("users").doc(uid);
    await userProfileRef.set({
      nombre: nombre,
      email: email,
      role: role,
      empresaId: companyId,
      activo: true,
      createdAt: now,
      updatedAt: now,
      mustChangePassword: true, // Forzar cambio de contraseña
    }, { merge: true });

    // Crear una invitación para registro y trazabilidad
    const invitationRef = db.collection("invitacionesUsuarios").doc();
    await invitationRef.set({
        email: data.email,
        empresaId: data.companyId,
        empresaNombre: companyData.nombreFantasia || companyData.razonSocial || '',
        roleDeseado: data.role,
        estado: 'pendiente_auth', // Estado que indica que el usuario fue creado, pero falta que acepte
        uid: uid,
        createdAt: now,
        creadoPorUid: context.auth.uid,
    });
    
    // Enviar correo de invitación con el enlace correcto
    const acceptInviteUrl = buildAcceptInviteUrl(invitationRef.id, data.email);
    const platformUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const logoUrl = `${platformUrl}/logo.png`;

    await db.collection("mail").add({
      to: [data.email],
      message: {
        subject: `Bienvenido a PCG - Acceso para ${companyData.nombreFantasia}`,
        html: `
            <p>Hola ${data.nombre},</p>
            <p>Has sido registrado en la plataforma PCG para la empresa <strong>${companyData.nombreFantasia}</strong>.</p>
            <p>Tu rol asignado es: <strong>${data.role}</strong>.</p>
            <p>Tu contraseña temporal es: <strong>${data.password}</strong></p>
            <p>Para completar tu registro y acceder, por favor haz clic en el siguiente enlace. Se te pedirá que establezcas una nueva contraseña por seguridad.</p>
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
      role: role,
      companyId: companyId,
      message: 'Usuario creado directamente y con éxito.'
    };
});
