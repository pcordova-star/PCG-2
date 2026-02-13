// workspace/functions/src/createCompanyUser.ts
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminApp } from "./firebaseAdmin";
import { UserRecord } from "firebase-admin/auth";

const adminApp = getAdminApp();

function buildAcceptInviteUrl(invId: string, email: string): string {
  const rawBaseUrl =
    functions.config().app?.base_url || "http://localhost:3000";
  const appBaseUrl = rawBaseUrl.replace(/\/+$/, "");
  return `${appBaseUrl}/accept-invite?invId=${encodeURIComponent(
    invId
  )}&email=${encodeURIComponent(email)}`;
}

export const createCompanyUser = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "No autenticado."
      );
    }

    const auth = adminApp.auth();
    const db = adminApp.firestore();

    const requesterClaims = await auth.getUser(context.auth.uid);
    if (requesterClaims.customClaims?.role !== "superadmin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Solo SUPER_ADMIN puede crear usuarios."
      );
    }

    if (!data.companyId || !data.email || !data.nombre || !data.role) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Faltan campos obligatorios: companyId, email, nombre, role."
      );
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

    let userRecord: UserRecord;
    let isExistingUser = false;

    try {
      // Primero, intenta obtener el usuario para ver si existe
      userRecord = await auth.getUserByEmail(data.email);
      isExistingUser = true;
      logger.info(`El usuario con email ${data.email} ya existe (UID: ${userRecord.uid}). Se procederá a actualizarlo.`);
      
      // Actualizar los detalles del usuario existente
      await auth.updateUser(userRecord.uid, {
          password: data.password,
          displayName: data.nombre,
          disabled: false, // Asegurarse de que el usuario esté habilitado
      });
      logger.info(`Usuario existente ${userRecord.uid} actualizado con nueva contraseña y nombre.`);

    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        // El usuario no existe, así que lo creamos
        logger.info(`Usuario con email ${data.email} no encontrado. Se creará uno nuevo.`);
        isExistingUser = false;
        try {
           userRecord = await auth.createUser({
                email: data.email,
                password: data.password,
                displayName: data.nombre,
                emailVerified: false, // El usuario lo verificará al iniciar sesión
                disabled: false,
            });
            logger.info(`Usuario creado con éxito para ${data.email} con UID: ${userRecord.uid}`);
        } catch (creationError: any) {
             logger.error("Error creando usuario en Firebase Auth:", creationError);
             throw new functions.https.HttpsError("internal", "Error interno al crear el usuario en Auth.", creationError);
        }
      } else {
        // Manejar otros errores potenciales de getUserByEmail
        logger.error("Error buscando usuario en Firebase Auth:", error);
        throw new functions.https.HttpsError("internal", "Error interno al verificar el usuario en Auth.", error);
      }
    }

    if (!userRecord) {
        // Esto no debería suceder, pero es una salvaguarda
        throw new functions.https.HttpsError("internal", "No se pudo obtener el registro del usuario.");
    }

    const uid = userRecord.uid;

    // Asignar custom claims sin importar si el usuario es nuevo o existente
    await auth.setCustomUserClaims(uid, {
      role: data.role,
      companyId: data.companyId,
    });
    
    // Establecer/actualizar el documento de usuario en Firestore
    const now = FieldValue.serverTimestamp();
    await db.collection("users").doc(uid).set({
        nombre: data.nombre,
        email: data.email,
        role: data.role,
        empresaId: data.companyId,
        activo: true,
        createdAt: isExistingUser ? undefined : now, // No sobreescribir createdAt si el usuario ya existía
        updatedAt: now,
        mustChangePassword: true, // Forzar siempre el cambio de contraseña en creación/actualización manual
    }, { merge: true });

    // Crear un nuevo documento de invitación para activar el flujo de correo electrónico.
    const invitationRef = db.collection("invitacionesUsuarios").doc();
    await invitationRef.set({
        email: data.email,
        empresaId: data.companyId,
        empresaNombre: companyData.nombreFantasia || companyData.razonSocial || "",
        roleDeseado: data.role,
        estado: "pendiente_auth", // Estado que indica que existe una cuenta pero requiere el flujo de activación
        uid,
        createdAt: now,
        creadoPorUid: context.auth!.uid,
    });
    
    // Construir la URL para el correo electrónico
    const acceptInviteUrl = buildAcceptInviteUrl(invitationRef.id, data.email);
    
    // Enviar correo electrónico a través de la extensión Trigger Email
    await db.collection("mail").add({
      to: [data.email],
      message: {
        from: "PCG Operación <control@pcgoperacion.com>",
        subject: `[PCG] Tu cuenta ha sido ${isExistingUser ? 'actualizada' : 'creada'} en ${companyData.nombreFantasia}`,
        html: `
          <p>Hola ${data.nombre},</p>
          <p>Tu cuenta para acceder a la plataforma PCG en nombre de <strong>${companyData.nombreFantasia}</strong> ha sido ${isExistingUser ? 'actualizada por un administrador' : 'creada'}.</p>
          <p>Se te ha asignado una contraseña temporal. Por tu seguridad, deberás cambiarla en tu primer inicio de sesión.</p>
          <p><a href="${acceptInviteUrl}">Haz clic aquí para iniciar sesión y cambiar tu contraseña.</a></p>
          <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
          <p>${acceptInviteUrl}</p>
        `,
      },
    });

    return {
      uid,
      email: data.email,
      nombre: data.nombre,
      role: data.role,
      companyId: data.companyId,
      message: `Usuario ${isExistingUser ? 'actualizado' : 'creado'} exitosamente.`,
    };
  });
