// functions/src/deactivateCompanyUser.ts
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";
import cors from "cors";

if (!admin.apps.length) {
  admin.initializeApp();
}

const corsHandler = cors({ origin: true });

export const deactivateCompanyUser = onRequest(
  {
    region: "southamerica-west1",
    cpu: 1,
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
  },
  (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        res.status(405).json({ success: false, error: "Method Not Allowed" });
        return;
      }

      try {
        // 1. Autenticación y Autorización
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          res.status(401).json({ success: false, error: "Unauthorized: No token provided." });
          return;
        }
        const token = authHeader.split(" ")[1];
        const decodedToken = await getAuth().verifyIdToken(token);
        
        if (decodedToken.role !== "superadmin") {
          res.status(403).json({ success: false, error: "Permission Denied: Caller is not a superadmin." });
          return;
        }

        // 2. Validación de Datos
        const { userId, motivo } = req.body;
        if (!userId) {
          res.status(400).json({ success: false, error: "Bad Request: userId is required." });
          return;
        }

        const auth = admin.auth();
        const db = admin.firestore();

        // 3. Lógica de Desactivación
        logger.info(`Iniciando desactivación para usuario ${userId} por ${decodedToken.uid}`);

        // a) Deshabilitar en Firebase Auth
        await auth.updateUser(userId, { disabled: true });
        logger.info(`Usuario ${userId} deshabilitado en Firebase Auth.`);

        // b) Marcar como inactivo en Firestore y añadir auditoría
        const userDocRef = db.collection("users").doc(userId);
        await userDocRef.update({
          activo: false,
          fechaBaja: admin.firestore.FieldValue.serverTimestamp(),
          motivoBaja: motivo || "Desactivado por administrador.",
          bajaPorUid: decodedToken.uid,
        });
        logger.info(`Documento de usuario ${userId} marcado como inactivo en Firestore.`);

        // 4. Revocar tokens de sesión (seguridad adicional)
        await auth.revokeRefreshTokens(userId);
        logger.info(`Tokens de sesión para ${userId} revocados.`);

        // 5. Respuesta Exitosa
        res.status(200).json({ success: true, message: `Usuario ${userId} ha sido desactivado.` });

      } catch (error: any) {
        logger.error(`Error al desactivar usuario:`, error);
        res.status(500).json({ success: false, error: "Internal Server Error", details: error.message });
      }
    });
  }
);
