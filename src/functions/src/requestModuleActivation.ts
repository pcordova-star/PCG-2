// src/functions/src/requestModuleActivation.ts
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";

if (!admin.apps.length) {
  admin.initializeApp();
}

const SUPERADMIN_EMAIL = "pauloandrescordova@gmail.com"; 

export const requestModuleActivation = onRequest(
  {
    region: "southamerica-west1",
    cors: true, // Habilitar CORS directamente en las opciones de la función v2
  },
  async (req, res) => {
    // El manejo de OPTIONS y encabezados CORS ahora es gestionado por Firebase
    // gracias a la opción `cors: true`.

    if (req.method !== "POST") {
      res.status(405).json({ success: false, error: "Method Not Allowed" });
      return;
    }

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
        res.status(400).json({ success: false, error: "El usuario no está asociado a ninguna empresa." });
        return;
      }

      const { moduleId, moduleTitle } = req.body;
      if (!moduleId || !moduleTitle) {
        res.status(400).json({ success: false, error: "Faltan los parámetros 'moduleId' y 'moduleTitle'." });
        return;
      }

      const db = admin.firestore();
      const companyRef = db.collection("companies").doc(companyId as string);
      const companySnap = await companyRef.get();

      const companyName = companySnap.exists
        ? companySnap.data()?.nombreFantasia || "Empresa sin nombre"
        : "Empresa desconocida";

      // Registrar solicitud
      const requestRef = await db.collection("moduleActivationRequests").add({
        companyId,
        companyName,
        moduleId,
        moduleTitle,
        requestedByUserId: uid,
        requestedByUserEmail: userEmail,
        requestedByUserName: userName,
        requestedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "pending",
      });

      logger.info(`Solicitud de activación registrada: ${requestRef.id}`);

      // enviar correo al superadmin
      await db.collection("mail").add({
        to: [SUPERADMIN_EMAIL],
        message: {
          subject: `PCG: Nueva solicitud de activación de módulo - ${companyName}`,
          html: `
            <p>Se ha recibido una nueva solicitud de activación de módulo:</p>
            <ul>
              <li><strong>Empresa:</strong> ${companyName} (${companyId})</li>
              <li><strong>Módulo Solicitado:</strong> ${moduleTitle} (${moduleId})</li>
              <li><strong>Solicitado por:</strong> ${userName} (${userEmail})</li>
            </ul>
          `,
        },
      });

      res.status(200).json({ success: true, message: "Solicitud registrada y notificada." });

    } catch (error: any) {
      logger.error("Error al procesar la solicitud de activación:", error);
      res.status(500).json({ success: false, error: "Ocurrió un error al procesar tu solicitud." });
    }
  }
);
