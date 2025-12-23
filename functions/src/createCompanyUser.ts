// functions/src/createCompanyUser.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

// Se define la URL base de la aplicación. Para producción, esto debería ser una variable de entorno.
const APP_BASE_URL = "https://www.pcgoperacion.com";

export const createCompanyUser = onCall(
  {
    region: "southamerica-west1",
    cpu: 1,
    memory: "256MiB",
    timeoutSeconds: 60,
    cors: true
  },
  async (request) => {
    const auth = admin.auth();
    const db = admin.firestore();
    const ctx = request.auth;

    if (!ctx) {
      throw new HttpsError("unauthenticated", "No autenticado.");
    }

    // Validación de permisos robusta para superadmin
    const requesterClaims = await auth.getUser(ctx.uid);
    if (requesterClaims.customClaims?.role !== "superadmin") {
      throw new HttpsError(
        "permission-denied",
        "Solo SUPER_ADMIN puede crear usuarios."
      );
    }

    const data = request.data as {
      companyId: string;
      email: string;
      nombre: string;
      role: "admin_empresa" | "jefe_obra" | "prevencionista" | "cliente";
    };

    if (!data.companyId || !data.email || !data.nombre || !data.role) {
      throw new HttpsError(
        "invalid-argument",
        "Faltan campos obligatorios: companyId, email, nombre, role."
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
      userRecord = await auth.getUserByEmail(data.email);
      logger.info(`Usuario existente encontrado para ${data.email}. Reutilizando UID: ${userRecord.uid}`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        logger.info(`No existe usuario para ${data.email}. Creando uno nuevo.`);
        userRecord = await auth.createUser({
          email: data.email,
          displayName: data.nombre,
          emailVerified: false,
          disabled: false,
        });
      } else {
        throw new HttpsError("internal", "Error verificando el usuario en Auth.", error);
      }
    }

    const uid = userRecord.uid;

    await auth.setCustomUserClaims(uid, {
      role: data.role,
      companyId: data.companyId,
      mustChangePassword: true, // Forzamos el cambio de contraseña en el primer login
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
    }, { merge: true });
    
    const invitationRef = db.collection("invitacionesUsuarios").doc();
    const invitationId = invitationRef.id;
    await invitationRef.set({
        email: data.email,
        empresaId: data.companyId,
        empresaNombre: companyData?.nombreFantasia || companyData?.razonSocial || '',
        roleDeseado: data.role,
        estado: 'pendiente', 
        createdAt: now,
        creadoPorUid: ctx.uid,
    });
    
    const actionCodeSettings = {
        url: `${APP_BASE_URL}/login/usuario?email=${encodeURIComponent(data.email)}`,
        handleCodeInApp: true,
    };

    const passwordResetLink = await auth.generatePasswordResetLink(data.email, actionCodeSettings);

    await db.collection("mail").add({
      to: [data.email],
      message: {
        subject: `Bienvenido a PCG - Acceso para ${companyData?.nombreFantasia || companyData?.razonSocial}`,
        html: `
            <p>Hola ${data.nombre},</p>
            <p>Has sido registrado en la plataforma PCG para la empresa <strong>${companyData?.nombreFantasia || companyData?.razonSocial}</strong>.</p>
            <p>Tu rol asignado es: <strong>${data.role}</strong>.</p>
            <p>Para completar tu registro y activar tu cuenta, por favor establece tu contraseña haciendo clic en el siguiente enlace:</p>
            <p><a href="${passwordResetLink}">Activar mi cuenta y definir contraseña</a></p>
            <p>Si el botón no funciona, copia y pega esta URL en tu navegador:</p>
            <p><a href="${passwordResetLink}">${passwordResetLink}</a></p>
            <p>Por seguridad, establece tu contraseña desde el enlace de activación.</p>
            <p>Gracias,<br>El equipo de PCG</p>`,
      },
    });

    return {
      uid,
      email: data.email,
      nombre: data.nombre,
      role: data.role,
      companyId: data.companyId,
    };
  }
);
