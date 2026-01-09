
// src/functions/src/deactivateCompanyUser.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";
import cors from "cors";

const corsHandler = cors({ origin: true });

export const deactivateCompanyUser = functions.region("us-central1").https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                throw new functions.https.HttpsError("unauthenticated", "Unauthorized: No token provided.");
            }
            const token = authHeader.split(" ")[1];
            const decodedToken = await getAuth().verifyIdToken(token);
            const userClaims = (decodedToken as any).role;
            
            if (userClaims !== "superadmin") {
                throw new functions.https.HttpsError("permission-denied", "Permission Denied: Caller is not a superadmin.");
            }

            const { userId, motivo } = req.body;
            if (!userId) {
                throw new functions.https.HttpsError("invalid-argument", "Bad Request: userId is required.");
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
            if (error.code) {
                 res.status(400).json({ success: false, error: error.message, code: error.code });
            } else {
                 res.status(500).json({ success: false, error: "Internal Server Error", details: error.message });
            }
        }
    });
});
