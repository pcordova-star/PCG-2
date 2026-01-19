// workspace/functions/src/deactivateCompanyUser.ts
import * as functions from 'firebase-functions';
import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";
import * as admin from "firebase-admin";
import { getAdminApp } from "./firebaseAdmin";

const cors = require('cors')({origin: true});
const adminApp = getAdminApp();

export const deactivateCompanyUser = functions.region("us-central1").runWith({ memory: "256MB", timeoutSeconds: 30 }).https.onRequest((req, res) => {
    cors(req, res, async () => {
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
          
          const userClaims = (decodedToken as any).role;
          if (userClaims !== "superadmin") {
            res.status(403).json({ success: false, error: "Permission Denied: Caller is not a superadmin." });
            return;
          }

          const { userId, motivo } = req.body;
          if (!userId) {
            res.status(400).json({ success: false, error: "Bad Request: userId is required." });
            return;
          }

          const auth = admin.auth();
          const db = admin.firestore();

          logger.info(`Iniciando desactivación para usuario ${userId} por ${decodedToken.uid}`);

          await auth.updateUser(userId, { disabled: true });
          logger.info(`Usuario ${userId} deshabilitado en Firebase Auth.`);

          const userDocRef = db.collection("users").doc(userId);
          await userDocRef.update({
            activo: false,
            fechaBaja: admin.firestore.FieldValue.serverTimestamp(),
            motivoBaja: motivo || "Desactivado por administrador.",
            bajaPorUid: decodedToken.uid,
          });
          logger.info(`Documento de usuario ${userId} marcado como inactivo en Firestore.`);

          await auth.revokeRefreshTokens(userId);
          logger.info(`Tokens de sesión para ${userId} revocados.`);

          res.status(200).json({ success: true, message: `Usuario ${userId} ha sido desactivado.` });

        } catch (error: any) {
          logger.error(`Error al desactivar usuario:`, error);
          res.status(500).json({ success: false, error: "Internal Server Error", details: error.message });
        }
    });
});
