// functions/src/createCompanyUser.ts
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";
import cors from "cors";

// Iniciamos CORS para permitir peticiones desde el frontend
const corsHandler = cors({ origin: true });

export const createCompanyUser = onRequest(
  {
    region: "southamerica-west1",
    cpu: 1,
    memory: "256MiB",
    timeoutSeconds: 60,
    cors: true, // Habilitar CORS en la configuración de la función
  },
  (req, res) => {
    corsHandler(req, res, async () => {
      // Solo permitir método POST
      if (req.method !== "POST") {
        res.status(405).json({ success: false, error: "Method Not Allowed" });
        return;
      }

      try {
        // 1. Autenticación Manual
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          res.status(401).json({ success: false, error: "Unauthorized: No token provided." });
          return;
        }
        const token = authHeader.split(" ")[1];
        const decodedToken = await getAuth().verifyIdToken(token);
        
        // 2. Validación de Permisos (Superadmin)
        if (decodedToken.role !== "superadmin") {
          res.status(403).json({ success: false, error: "Permission Denied: Caller is not a superadmin." });
          return;
        }

        // 3. Validación de Datos de Entrada (desde req.body)
        const { companyId, email, nombre, role, password } = req.body;
        if (!companyId || !email || !nombre || !role || !password || password.length < 6) {
          res.status(400).json({ success: false, error: "Invalid argument: Faltan campos obligatorios o la contraseña es muy corta." });
          return;
        }
        
        const db = admin.firestore();
        const auth = admin.auth();

        const companyRef = db.collection("companies").doc(companyId);
        const companySnap = await companyRef.get();
        if (!companySnap.exists) {
          res.status(404).json({ success: false, error: "Not Found: La empresa no existe." });
          return;
        }

        // 4. Lógica de Negocio (Creación de Usuario)
        let userRecord;
        try {
          userRecord = await auth.createUser({ email, password, displayName: nombre, emailVerified: true, disabled: false });
          logger.info(`Usuario creado con UID: ${userRecord.uid}`);
        } catch (error: any) {
          if (error.code === 'auth/email-already-exists') {
            res.status(409).json({ success: false, error: "Conflict: Ya existe un usuario con este correo." });
            return;
          }
          throw error; // Lanzar otros errores de Auth para ser capturados por el catch principal
        }
        
        const uid = userRecord.uid;

        // 5. Asignar Claims y Guardar en Firestore
        await auth.setCustomUserClaims(uid, { role, companyId });
        
        const userProfileRef = db.collection("users").doc(uid);
        await userProfileRef.set({
          nombre, email, role, empresaId: companyId, activo: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // 6. Respuesta Exitosa
        res.status(200).json({
          success: true,
          data: { uid, email, nombre, role, companyId, message: "Usuario creado con éxito." }
        });

      } catch (error: any) {
        logger.error("Error en createCompanyUser:", error);
        res.status(500).json({ success: false, error: "Internal Server Error", details: error.message });
      }
    });
  }
);
