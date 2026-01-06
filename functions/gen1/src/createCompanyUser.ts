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
    
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "No autenticado.");
    }
    
    const auth = admin.auth();
    const db = admin.firestore();

    const requesterClaims = await auth.getUser(context.auth.uid);
    if (requesterClaims.customClaims?.role !== "superadmin") {
      throw new functions.https.HttpsError("permission-denied", "Solo SUPER_ADMIN puede crear usuarios.");
    }
    
    const { companyId, email, nombre, role, password } = data as {
      companyId: string;
      email: string;
      nombre: string;
      role: "admin_empresa" | "jefe_obra" | "prevencionista" | "cliente";
      password?: string;
    };

    if (!companyId || !email || !nombre || !role) {
      throw new functions.https.HttpsError("invalid-argument", "Faltan campos obligatorios: companyId, email, nombre, role.");
    }
    
    if (!password || password.length < 6) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "La contraseña es obligatoria y debe tener al menos 6 caracteres."
        );
    }

    const companyRef = db.collection("companies").doc(companyId);
    const companySnap = await companyRef.get();
    if (!companySnap.exists) {
      throw new functions.https.HttpsError("not-found", "La empresa no existe.");
    }
    const companyData = companySnap.data()!;


    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: data.email,
        password: data.password,
        displayName: data.nombre,
        emailVerified: true, // Se crea verificado para que el usuario no tenga que hacer nada
        disabled: false,
      });
      logger.info(`Usuario creado con éxito para ${data.email} con UID: ${userRecord.uid}`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        throw new functions.https.HttpsError("already-exists", "Ya existe un usuario con este correo electrónico.");
      }
      logger.error("Error creando usuario en Firebase Auth:", error);
      throw new functions.https.HttpsError("internal", "Error interno al crear el usuario en Auth.", error);
    }

    const uid = userRecord.uid;

    await auth.setCustomUserClaims(uid, {
      role: data.role,
      companyId: data.companyId,
    });

    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const userProfileRef = db.collection("users").doc(uid);
    await userProfileRef.set({
      nombre: data.nombre,
      email: data.email,
      role: data.role,
      empresaId: data.companyId,
      activo: true,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
    
    const invitationRef = db.collection("invitacionesUsuarios").doc();
    await invitationRef.set({
        email: data.email,
        empresaId: data.companyId,
        empresaNombre: companyData.nombreFantasia || companyData.razonSocial || '',
        roleDeseado: data.role,
        estado: 'activado', // El usuario se crea activo directamente
        uid: uid,
        createdAt: now,
        activatedAt: now,
        creadoPorUid: context.auth.uid,
    });

    return {
      uid,
      email: data.email,
      nombre: data.nombre,
      role: data.role,
      companyId: data.companyId,
      message: 'Usuario creado directamente y con éxito.'
    };
});
