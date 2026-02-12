// workspace/functions/src/createCompanyUser.ts
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminApp } from "./firebaseAdmin";

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

    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: data.email,
        password: data.password,
        displayName: data.nombre,
        emailVerified: false,
        disabled: false,
      });

      logger.info(
        `Usuario creado con éxito para ${data.email} con UID: ${userRecord.uid}`
      );
    } catch (error: any) {
      if (error.code === "auth/email-already-exists") {
        throw new functions.https.HttpsError(
          "already-exists",
          "Ya existe un usuario con este correo electrónico."
        );
      }

      logger.error("Error creando usuario en Firebase Auth:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Error interno al crear el usuario en Auth.",
        error
      );
    }

    const uid = userRecord.uid;

    await auth.setCustomUserClaims(uid, {
      role: data.role,
      companyId: data.companyId,
    });

    const now = FieldValue.serverTimestamp();

    await db.collection("users").doc(uid).set(
      {
        nombre: data.nombre,
        email: data.email,
        role: data.role,
        empresaId: data.companyId,
        activo: true,
        createdAt: now,
        updatedAt: now,
        mustChangePassword: true,
      },
      { merge: true }
    );

    const invitationRef = db.collection("invitacionesUsuarios").doc();
    await invitationRef.set({
      email: data.email,
      empresaId: data.companyId,
      empresaNombre:
        companyData.nombreFantasia || companyData.razonSocial || "",
      roleDeseado: data.role,
      estado: "pendiente_auth",
      uid,
      createdAt: now,
      creadoPorUid: context.auth.uid,
    });

    const acceptInviteUrl = buildAcceptInviteUrl(invitationRef.id, data.email);

    await db.collection("mail").add({
      to: [data.email],
      message: {
        from: "PCG Operación <control@pcgoperacion.com>",
        subject: `[INVITACIÓN] Bienvenido a ${companyData.nombreFantasia} en PCG`,
        html: `
          <p>Hola ${data.nombre},</p>
          <p>Has sido invitado a unirte a <strong>${companyData.nombreFantasia}</strong>.</p>
          <p><a href="${acceptInviteUrl}">Aceptar invitación</a></p>
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
      message: "Usuario creado exitosamente.",
    };
  });
