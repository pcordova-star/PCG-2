// src/functions/src/requestModuleActivation.ts
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "./firebaseAdmin";
import * as admin from "firebase-admin";

const adminApp = getAdminApp();

const SUPERADMIN_EMAIL = "pauloandrescordova@gmail.com"; 

export const requestModuleActivation = onRequest(
  {
    region: "southamerica-west1",
    cors: true 
  },
  async (req, res) => {

    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    
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
      
      let companyId = (decodedToken as any).companyId;

      // ---- INICIO DE LA MODIFICACIÓN ----
      // Si el companyId no está en los claims, búscalo en Firestore como fallback.
      if (!companyId) {
        logger.info(`companyId no encontrado en los claims para UID ${uid}. Buscando en Firestore...`);
        const userDoc = await adminApp.firestore().collection("users").doc(uid).get();
        if (userDoc.exists()) {
          companyId = userDoc.data()?.empresaId;
        }
      }
      // ---- FIN DE LA MODIFICACIÓN ----

      if (!companyId) {
        res.status(400).json({ success: false, error: "El usuario no está asociado a ninguna empresa." });
        return;
      }

      const { moduleId, moduleTitle } = req.body;
      if (!moduleId || !moduleTitle) {
        res.status(400).json({ success: false, error: "Faltan los parámetros 'moduleId' y 'moduleTitle'." });
        return;
      }

      const db = adminApp.firestore();
      const companyRef = db.collection("companies").doc(companyId as string);
      const companySnap = await companyRef.get();

      const companyName = companySnap.exists
        ? companySnap.data()?.nombreFantasia || "Empresa sin nombre"
        : "Empresa desconocida";

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
