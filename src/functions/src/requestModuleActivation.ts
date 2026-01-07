// src/functions/src/requestModuleActivation.ts
import { onRequest, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";


if (!admin.apps.length) {
  admin.initializeApp();
}

const SUPERADMIN_EMAIL = "pauloandrescordova@gmail.com"; // Email para notificaciones

export const requestModuleActivation = onRequest({ cors: false }, async (req, res) => {
  // --- MANEJO MANUAL DE CORS ---
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    // Respuesta pre-flight para CORS
    res.status(204).send("");
    return;
  }
  
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method Not Allowed" });
    return;
  }
  // --- FIN MANEJO MANUAL DE CORS ---
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, error: "Unauthorized: No token provided." });
      return;
    }
    const token = authHeader.split(" ")[1];
    const decodedToken = await getAuth().verifyIdToken(token);

    const { uid } = decodedToken;
    const userEmail = decodedToken.email || "No disponible";
    const userName = decodedToken.name || userEmail;
    const companyId = (decodedToken as any).companyId;

    if (!companyId) {
      res.status(400).json({ success: false, error: "El usuario no está asociado a ninguna empresa."});
      return;
    }

    const { moduleId, moduleTitle } = req.body;
    if (!moduleId || !moduleTitle) {
      res.status(400).json({ success: false, error: "Faltan los parámetros 'moduleId' y 'moduleTitle'."});
      return;
    }

    const db = admin.firestore();
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

    res.status(200).json({ success: true, message: "Solicitud registrada y notificada." });

  } catch (error: any) {
    logger.error("Error al procesar la solicitud de activación:", error);
    if (error.code === 'auth/id-token-expired') {
        res.status(401).json({ success: false, error: "Token expirado, por favor inicie sesión de nuevo." });
    } else {
        res.status(500).json({ success: false, error: "Ocurrió un error al procesar tu solicitud." });
    }
  }
});
