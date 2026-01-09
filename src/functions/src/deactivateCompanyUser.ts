// functions/src/deactivateCompanyUser.ts
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";

// NO inicializar admin aquí en el scope global.

export const deactivateCompanyUser = onRequest(
  {
    region: "southamerica-west1",
    cpu: 1,
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: false, // Se deshabilita el CORS automático de Firebase para manejarlo manualmente
    serviceAccount: "pcg-functions-sa@pcg-2-8bf1b.iam.gserviceaccount.com",
  },
  async (req, res) => {
    // La inicialización se mueve DENTRO del handler.
    if (!admin.apps.length) {
      admin.initializeApp();
    }

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
      // 1. Autenticación y Autorización
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ success: false, error: "Unauthorized: No token provided." });
        return;
      }
      const token = authHeader.split(" ")[1];
      const decodedToken = await getAuth().verifyIdToken(token);
      
      const userClaims = (decodedToken as any).role; // Acceder a custom claims
      if (userClaims !== "superadmin") {
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
  }
);
