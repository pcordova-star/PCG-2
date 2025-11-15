import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const createCompanyUser = onCall(
  { region: "southamerica-west1" },
  async (request) => {
    const auth = admin.auth();
    const db = admin.firestore();

    const ctx = request.auth;

    // 1. Validar que el usuario está autenticado
    if (!ctx) {
      throw new HttpsError("unauthenticated", "No autenticado.");
    }

    // 2. Validar que el usuario es SUPER_ADMIN vía customClaims
    const requesterRole = ctx.token.role;
    if (requesterRole !== "SUPER_ADMIN") {
      throw new HttpsError(
        "permission-denied",
        "Solo SUPER_ADMIN puede crear usuarios."
      );
    }

    // 3. Validar payload de entrada
    const data = request.data as {
      companyId: string;
      email: string;
      password?: string;
      nombre: string;
      role: "EMPRESA_ADMIN" | "JEFE_OBRA" | "PREVENCIONISTA" | "LECTOR_CLIENTE";
      phone?: string;
      obrasAsignadas?: string[];
    };

    if (!data.companyId || !data.email || !data.nombre || !data.role) {
      throw new HttpsError(
        "invalid-argument",
        "Faltan campos obligatorios: companyId, email, nombre, role."
      );
    }
    
    if (!data.password || data.password.length < 6) {
        throw new HttpsError(
            "invalid-argument",
            "La contraseña es obligatoria y debe tener al menos 6 caracteres."
        );
    }


    // 4. Verificar que la empresa existe y está activa
    const companyRef = db.collection("companies").doc(data.companyId);
    const companySnap = await companyRef.get();
    if (!companySnap.exists) {
      throw new HttpsError("not-found", "La empresa no existe.");
    }

    const companyData = companySnap.data() as { activa?: boolean };
    if (companyData.activa === false) {
      throw new HttpsError(
        "failed-precondition",
        "La empresa está inactiva; no se pueden crear usuarios."
      );
    }

    // 5. Crear usuario en Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: data.email,
        password: data.password,
        displayName: data.nombre,
        emailVerified: false,
        disabled: false,
        phoneNumber: data.phone || undefined,
      });
    } catch (error: any) {
      if (error.code === "auth/email-already-exists") {
        throw new HttpsError(
          "already-exists",
          "Ya existe un usuario con este email."
        );
      }
      throw new HttpsError("internal", "Error creando el usuario en Auth.", error);
    }

    const uid = userRecord.uid;

    // 6. Asignar custom claims (role y companyId)
    await auth.setCustomUserClaims(uid, {
      role: data.role,
      companyId: data.companyId,
    });

    // 7. Escribir en Firestore (users y companies/{companyId}/users)
    const now = admin.firestore.FieldValue.serverTimestamp();

    const appUserRef = db.collection("users").doc(uid);
    const companyUserRef = companyRef.collection("users").doc(uid);

    await db.runTransaction(async (tx) => {
      tx.set(
        appUserRef,
        {
          nombre: data.nombre,
          email: data.email,
          phone: data.phone || null,
          isSuperAdmin: false,
          companyIdPrincipal: data.companyId,
          createdAt: now,
        },
        { merge: true }
      );

      tx.set(
        companyUserRef,
        {
          uid,
          email: data.email,
          nombre: data.nombre,
          role: data.role,
          obrasAsignadas: data.obrasAsignadas || [],
          activo: true,
          createdAt: now,
        },
        { merge: true }
      );
    });

    // 8. Respuesta a frontend
    return {
      uid,
      email: data.email,
      nombre: data.nombre,
      role: data.role,
      companyId: data.companyId,
    };
  }
);
