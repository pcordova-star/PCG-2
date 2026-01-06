
// functions/src/createCompanyUser.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const createCompanyUser = onCall(
  {
    region: "southamerica-west1",
    cpu: 1,
    memory: "256MiB",
    timeoutSeconds: 60,
    cors: true
  },
  async (request) => {
    
    // --- Log Defensivo Inicial ---
    logger.info("[createCompanyUser] Invoked", {
      auth: {
        uid: request.auth?.uid,
        token: request.auth?.token.email,
      },
      data: {
        companyId: request.data.companyId,
        email: request.data.email,
        nombre: request.data.nombre,
        role: request.data.role,
        hasPassword: !!request.data.password,
      }
    });

    try {
      const auth = admin.auth();
      const db = admin.firestore();
      const ctx = request.auth;

      if (!ctx || !ctx.uid) {
        logger.error("[createCompanyUser] Error: La función fue llamada sin un contexto de autenticación válido.");
        throw new HttpsError("unauthenticated", "No autenticado o UID no disponible.");
      }

      const requesterClaims = await auth.getUser(ctx.uid);
      if (requesterClaims.customClaims?.role !== "superadmin") {
        logger.warn(`[createCompanyUser] Permission denied for user ${ctx.uid}. Role is not 'superadmin'.`);
        throw new HttpsError("permission-denied", "Solo SUPER_ADMIN puede crear usuarios.");
      }

      const data = request.data;
      if (!data.companyId || !data.email || !data.nombre || !data.role) {
        logger.error("[createCompanyUser] Error: Faltan campos obligatorios.", { data });
        throw new HttpsError("invalid-argument", "Faltan campos obligatorios: companyId, email, nombre, role.");
      }
      
      if (!data.password || typeof data.password !== 'string' || data.password.length < 6) {
        logger.error("[createCompanyUser] Error: Contraseña inválida o ausente.");
        throw new HttpsError("invalid-argument", "La contraseña es obligatoria y debe ser un string de al menos 6 caracteres.");
      }

      const companyRef = db.collection("companies").doc(data.companyId);
      const companySnap = await companyRef.get();
      if (!companySnap.exists) {
        logger.error(`[createCompanyUser] Error: Empresa con ID ${data.companyId} no encontrada.`);
        throw new HttpsError("not-found", "La empresa no existe.");
      }
      const companyData = companySnap.data();

      let userRecord;
      try {
        logger.info(`[createCompanyUser] Intentando crear usuario en Auth para ${data.email}`);
        userRecord = await auth.createUser({
          email: data.email,
          password: data.password,
          displayName: data.nombre,
          emailVerified: true,
          disabled: false,
        });
        logger.info(`[createCompanyUser] Usuario creado en Auth con UID: ${userRecord.uid}`);
      } catch (error: any) {
        logger.error("[createCompanyUser] Error al crear usuario en Firebase Auth:", error);
        if (error.code === 'auth/email-already-exists') {
          throw new HttpsError("already-exists", "Ya existe un usuario con este correo electrónico.");
        }
        throw new HttpsError("internal", `Error interno al crear el usuario en Auth: ${error.message}`);
      }

      const uid = userRecord.uid;

      try {
        logger.info(`[createCompanyUser] Asignando claims y guardando perfil en Firestore para UID ${uid}`);
        
        await auth.setCustomUserClaims(uid, { role: data.role, companyId: data.companyId });
        
        const userProfileRef = db.collection("users").doc(uid);
        await userProfileRef.set({
          nombre: data.nombre,
          email: data.email,
          role: data.role,
          empresaId: data.companyId,
          activo: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        
        logger.info(`[createCompanyUser] Perfil de usuario creado en Firestore para UID: ${uid}`);

      } catch (dbError: any) {
        logger.error(`[createCompanyUser] Error al guardar perfil/claims para UID ${uid}. Revirtiendo creación en Auth...`, dbError);
        await auth.deleteUser(uid);
        logger.info(`[createCompanyUser] Usuario con UID ${uid} eliminado de Auth debido a error en Firestore.`);
        throw new HttpsError("internal", `No se pudo crear el perfil del usuario en la base de datos. Se ha revertido la creación. Error: ${dbError.message}`);
      }

      logger.info(`[createCompanyUser] Proceso completado con éxito para ${data.email}.`);
      return {
        uid,
        email: data.email,
        message: 'Usuario creado y registrado en la base de datos con éxito.'
      };

    } catch (error: any) {
      // --- Captura final para cualquier error no esperado ---
      logger.error("[createCompanyUser] Error catastrófico en la función:", {
          code: error.code,
          message: error.message,
          details: error.details,
      });

      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError("internal", "Ocurrió un error inesperado.", error.message);
    }
  }
);
