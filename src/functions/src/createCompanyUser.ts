// functions/src/createCompanyUser.ts
import * as functions from 'firebase-functions';
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

const APP_BASE_URL = "https://www.pcgoperacion.com";

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

    const companyRef = db.collection("companies").doc(companyId);
    const companySnap = await companyRef.get();
    if (!companySnap.exists) {
      throw new functions.https.HttpsError("not-found", "La empresa no existe.");
    }
    const companyData = companySnap.data()!;

    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      logger.info(`Usuario existente encontrado para ${email}. Reutilizando UID: ${userRecord.uid}`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        logger.info(`No existe usuario para ${email}. Creando uno nuevo.`);
        
        if (!password || password.length < 6) {
          throw new functions.https.HttpsError(
              "invalid-argument",
              "La contraseña es obligatoria para usuarios nuevos y debe tener al menos 6 caracteres."
          );
        }

        userRecord = await auth.createUser({
          email: email,
          password: password,
          displayName: nombre,
          emailVerified: false,
          disabled: false,
        });
      } else {
        logger.error("Error en Auth al buscar usuario:", error);
        throw new functions.https.HttpsError("internal", "Error verificando el usuario en Auth.", error.message);
      }
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
      mustChangePassword: !!password, // Forzar cambio si se creó con pass temporal
    }, { merge: true });
    
    const invitationRef = db.collection("invitacionesUsuarios").doc();
    const invitationId = invitationRef.id;
    await invitationRef.set({
        email: email,
        empresaId: companyId,
        empresaNombre: companyData?.nombreFantasia || companyData?.razonSocial || '',
        roleDeseado: role,
        estado: 'pendiente_auth', 
        createdAt: now,
        creadoPorUid: context.auth.uid,
    });
    
    const actionCodeSettings = {
        url: `${APP_BASE_URL}/accept-invite?invId=${encodeURIComponent(invitationId)}&email=${encodeURIComponent(email)}`,
        handleCodeInApp: false,
    };

    const passwordResetLink = await auth.generatePasswordResetLink(email, actionCodeSettings);

    await db.collection("mail").add({
      to: [email],
      message: {
        subject: `Bienvenido a PCG - Acceso para ${companyData?.nombreFantasia || companyData?.razonSocial}`,
        html: `
            <p>Hola ${nombre},</p>
            <p>Has sido registrado en la plataforma PCG para la empresa <strong>${companyData?.nombreFantasia || companyData?.razonSocial}</strong>.</p>
            <p>Tu rol asignado es: <strong>${role}</strong>.</p>
            <p>Para completar tu registro y activar tu cuenta, por favor establece tu contraseña haciendo clic en el siguiente enlace:</p>
            <p><a href="${passwordResetLink}">Activar mi cuenta y definir contraseña</a></p>
            <p>Si el botón no funciona, copia y pega esta URL en tu navegador:</p>
            <p><a href="${passwordResetLink}">${passwordResetLink}</a></p>
            <p>Gracias,<br>El equipo de PCG</p>`,
      },
    });

    return {
      uid,
      email: email,
      nombre: nombre,
      role: role,
      companyId: companyId,
    };
});
