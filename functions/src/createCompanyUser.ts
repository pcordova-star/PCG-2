// functions/src/createCompanyUser.ts
import * as functions from 'firebase-functions';
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const createCompanyUser = functions
  .region("southamerica-west1")
  .https.onCall(async (data, context) => {
    
    logger.info("[createCompanyUser] Invoked", {
      auth: {
        uid: context.auth?.uid,
        token: context.auth?.token.email,
      },
      data: {
        companyId: data.companyId,
        email: data.email,
        nombre: data.nombre,
        role: data.role,
        hasPassword: !!data.password,
      }
    });

    try {
      const auth = admin.auth();
      const db = admin.firestore();
      const ctx = context.auth;

      if (!ctx || !ctx.uid) {
        logger.error("[createCompanyUser] Error: La función fue llamada sin un contexto de autenticación válido.");
        throw new functions.https.HttpsError("unauthenticated", "No autenticado o UID no disponible.");
      }

      const requesterClaims = await auth.getUser(ctx.uid);
      if (requesterClaims.customClaims?.role !== "superadmin") {
        logger.warn(`[createCompanyUser] Permission denied for user ${ctx.uid}. Role is not 'superadmin'.`);
        throw new functions.https.HttpsError("permission-denied", "Solo SUPER_ADMIN puede crear usuarios.");
      }

      if (!data.companyId || !data.email || !data.nombre || !data.role) {
        logger.error("[createCompanyUser] Error: Faltan campos obligatorios.", { data });
        throw new functions.https.HttpsError("invalid-argument", "Faltan campos obligatorios: companyId, email, nombre, role.");
      }
      
      if (!data.password || typeof data.password !== 'string' || data.password.length < 6) {
        logger.error("[createCompanyUser] Error: Contraseña inválida o ausente.");
        throw new functions.https.HttpsError("invalid-argument", "La contraseña es obligatoria y debe ser un string de al menos 6 caracteres.");
      }

      const companyRef = db.collection("companies").doc(data.companyId);
      const companySnap = await companyRef.get();
      if (!companySnap.exists) {
        logger.error(`[createCompanyUser] Error: Empresa con ID ${data.companyId} no encontrada.`);
        throw new functions.https.HttpsError("not-found", "La empresa no existe.");
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
          throw new functions.https.HttpsError("already-exists", "Ya existe un usuario con este correo electrónico.");
        }
        throw new functions.https.HttpsError("internal", `Error interno al crear el usuario en Auth: ${error.message}`);
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
        // --- FIX DEFINITIVO: NO INTENTAR HACER ROLLBACK ---
        // Se loggea el error crítico, pero no se intenta borrar el usuario de Auth,
        // ya que esa operación es la que causa el error 'INTERNAL' en Gen2.
        logger.error(`[createCompanyUser] CRITICAL ERROR: No se pudo guardar el perfil/claims para UID ${uid} pero el usuario YA FUE CREADO en Auth. Requiere intervención manual.`, dbError);
        
        // Se lanza un error claro al frontend para que sepa que la operación falló, aunque el usuario Auth exista.
        throw new functions.https.HttpsError("internal", `El usuario fue creado en el sistema de autenticación, pero falló al guardar su perfil en la base de datos. Por favor, contacte a soporte. Error: ${dbError.message}`);
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

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      
      throw new functions.https.HttpsError("internal", "Ocurrió un error inesperado.", error.message);
    }
  }
);
