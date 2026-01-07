
// src/functions/src/requestModuleActivation.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

const SUPERADMIN_EMAIL = "pauloandrescordova@gmail.com"; // Email para notificaciones

export const requestModuleActivation = onCall({ cors: true }, async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
  }

  const { moduleId, moduleTitle } = request.data;
  if (!moduleId || !moduleTitle) {
    throw new HttpsError("invalid-argument", "Faltan los parámetros 'moduleId' y 'moduleTitle'.");
  }

  const { uid, token } = auth;
  const userEmail = token.email || "No disponible";
  const userName = token.name || userEmail;
  const companyId = token.companyId;

  if (!companyId) {
    throw new HttpsError("failed-precondition", "El usuario no está asociado a ninguna empresa.");
  }
  
  const db = admin.firestore();

  try {
    const companyRef = db.collection("companies").doc(companyId as string);
    const companySnap = await companyRef.get();
    const companyName = companySnap.exists() ? companySnap.data()?.nombreFantasia || "Empresa sin nombre" : "Empresa desconocida";

    // 1. Registrar la solicitud en Firestore
    const requestRef = await db.collection("moduleActivationRequests").add({
      companyId: companyId,
      companyName: companyName,
      moduleId: moduleId,
      moduleTitle: moduleTitle,
      requestedByUserId: uid,
      requestedByUserEmail: userEmail,
      requestedByUserName: userName,
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending",
    });

    logger.info(`Solicitud de activación registrada: ${requestRef.id} para la empresa ${companyName} (${companyId})`);

    // 2. Enviar notificación por email al superadmin
    await db.collection("mail").add({
      to: [SUPERADMIN_EMAIL],
      message: {
        subject: `PCG: Nueva solicitud de activación de módulo - ${companyName}`,
        html: `
          <p>Se ha recibido una nueva solicitud de activación de módulo:</p>
          <ul>
            <li><strong>Empresa:</strong> ${companyName} (ID: ${companyId})</li>
            <li><strong>Módulo Solicitado:</strong> ${moduleTitle} (ID: ${moduleId})</li>
            <li><strong>Solicitado por:</strong> ${userName} (${userEmail})</li>
            <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-CL')}</li>
          </ul>
          <p>Puedes gestionar las empresas y sus módulos en el panel de Superadministrador.</p>
        `,
      },
    });

    return { success: true, message: "Solicitud registrada y notificada." };

  } catch (error) {
    logger.error("Error al procesar la solicitud de activación:", error);
    throw new HttpsError("internal", "Ocurrió un error al procesar tu solicitud.");
  }
});
