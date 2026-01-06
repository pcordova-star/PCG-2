// functions/src/createCompanyUser.ts
import * as functions from 'firebase-functions';
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Crea un usuario de forma atómica en Firebase Auth y Firestore.
 * Recibe email, password, nombre, rol y companyId.
 * Si la creación del perfil en Firestore falla, revierte la creación en Auth.
 */
export const createCompanyUser = functions
  .region("southamerica-west1")
  .https.onCall(async (data, context) => {
    
    // 1. Validar autenticación y permisos del solicitante
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "No autenticado.");
    }
    
    const auth = admin.auth();
    const db = admin.firestore();

    const requesterClaims = await auth.getUser(context.auth.uid);
    if (requesterClaims.customClaims?.role !== "superadmin") {
      throw new functions.https.HttpsError("permission-denied", "Solo SUPER_ADMIN puede crear usuarios.");
    }
    
    // 2. Validar datos de entrada
    const { companyId, email, nombre, role, password } = data as {
      companyId: string;
      email: string;
      nombre: string;
      role: "admin_empresa" | "jefe_obra" | "prevencionista" | "cliente";
      password?: string;
    };

    if (!companyId || !email || !nombre || !role || !password || password.length < 6) {
      throw new functions.https.HttpsError("invalid-argument", "Faltan campos obligatorios o la contraseña es muy corta (mínimo 6 caracteres).");
    }
    
    const companyRef = db.collection("companies").doc(companyId);
    const companySnap = await companyRef.get();
    if (!companySnap.exists) {
      throw new functions.https.HttpsError("not-found", "La empresa especificada no existe.");
    }

    // 3. Crear usuario en Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email,
        password,
        displayName: nombre,
        emailVerified: true, // Se asume que el admin verifica el email
        disabled: false,
      });
      logger.info(`Usuario creado en Auth para ${email} con UID: ${userRecord.uid}`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        throw new functions.https.HttpsError("already-exists", "Ya existe un usuario con este correo electrónico.");
      }
      logger.error("Error creando usuario en Firebase Auth:", error);
      throw new functions.https.HttpsError("internal", `Error interno al crear el usuario en Auth: ${error.message}`);
    }

    const uid = userRecord.uid;

    try {
        // 4. Asignar Custom Claims (rol y empresa)
        await auth.setCustomUserClaims(uid, { role, companyId });

        // 5. Crear el documento del usuario en Firestore
        const userProfileRef = db.collection("users").doc(uid);
        await userProfileRef.set({
            nombre,
            email,
            role,
            empresaId: companyId,
            activo: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        logger.info(`Perfil de usuario creado en Firestore para UID: ${uid}`);

        // 6. Retornar éxito
        return {
            uid,
            email,
            message: 'Usuario creado y registrado en la base de datos con éxito.'
        };

    } catch (dbError: any) {
        // --- ROLLBACK MANUAL ---
        // Si falla la creación en Firestore o los claims, eliminamos el usuario de Auth.
        logger.error(`Error al guardar perfil/claims para UID ${uid}. Revirtiendo creación en Auth...`, dbError);
        await auth.deleteUser(uid);
        logger.info(`Usuario con UID ${uid} eliminado de Auth debido a error en Firestore.`);
        
        throw new functions.https.HttpsError("internal", `No se pudo crear el perfil del usuario en la base de datos. Se ha revertido la creación. Error: ${dbError.message}`);
    }
});