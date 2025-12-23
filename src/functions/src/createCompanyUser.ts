// functions/src/createCompanyUser.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

function buildAcceptInviteUrl(invId: string, email: string): string {
  const rawBaseUrl = "https://pcg-2-8bf1b.web.app";

  if (!rawBaseUrl) {
    console.error("CRÍTICO: No se pudo determinar la URL base de la aplicación. No se puede crear un enlace de invitación válido.");
    throw new HttpsError("internal", "El servidor no está configurado correctamente para enviar invitaciones. Falta la URL base de la aplicación.");
  }
  
  const appBaseUrl = rawBaseUrl.replace(/\/+$/, "");
  return `${appBaseUrl}/accept-invite?invId=${encodeURIComponent(invId)}&email=${encodeURIComponent(email)}`;
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
    const auth = admin.auth();
    const db = admin.firestore();

    const ctx = request.auth;

    // --- INICIO DE INSTRUMENTACIÓN ---
    logger.info("createCompanyUser: Invocada la función.", {
        authContext: {
            uid: ctx?.uid,
            tokenRole: ctx?.token.role,
        }
    });
    // --- FIN DE INSTRUMENTACIÓN ---


    // 1. Validar que el usuario está autenticado
    if (!ctx) {
      throw new HttpsError("unauthenticated", "No autenticado.");
    }

    // 2. Validar que el usuario es SUPER_ADMIN vía customClaims
    const requesterClaims = await auth.getUser(ctx.uid);
    
    // --- INICIO DE INSTRUMENTACIÓN ---
    logger.info("createCompanyUser: Verificando claims del invocador.", {
        uid: ctx.uid,
        customClaims: requesterClaims.customClaims,
        // Log solo las llaves para no exponer valores sensibles
        claimKeys: requesterClaims.customClaims ? Object.keys(requesterClaims.customClaims) : [],
    });
    // --- FIN DE INSTRUMENTACIÓN ---

    if (requesterClaims.customClaims?.role !== "superadmin") {
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
      role: "admin_empresa" | "jefe_obra" | "prevencionista" | "cliente";
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
    const companyData = companySnap.data();

    // 5. Crear usuario en Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: data.email,
        password: data.password,
        displayName: data.nombre,
        emailVerified: false, 
        disabled: false,
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

    const now = admin.firestore.FieldValue.serverTimestamp();
    
    // 7. Guardar perfil de usuario en /users
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
    
    // 8. Crear una invitación para registro y trazabilidad
    const invitationRef = db.collection("invitacionesUsuarios").doc();
    const invitationId = invitationRef.id;
    await invitationRef.set({
        email: data.email,
        empresaId: data.companyId,
        empresaNombre: companyData?.nombreFantasia || companyData?.razonSocial || '',
        roleDeseado: data.role,
        estado: 'pendiente', 
        createdAt: now,
        creadoPorUid: ctx.uid,
    });
    
    // 9. Enviar correo de invitación
    const acceptInviteUrl = buildAcceptInviteUrl(invitationId, data.email);

    await db.collection("mail").add({
      to: [data.email],
      message: {
        subject: `Bienvenido a PCG - Acceso para ${companyData?.nombre}`,
        html: `
            <p>Hola ${data.nombre},</p>
            <p>Has sido registrado en la plataforma PCG para la empresa <strong>${companyData?.nombre}</strong>.</p>
            <p>Tu rol asignado es: <strong>${data.role}</strong>.</p>
            <p>Para completar tu registro y acceder a la plataforma, por favor haz clic en el siguiente enlace. Se te pedirá que establezcas una nueva contraseña si es tu primer ingreso.</p>
            <p><a href="${acceptInviteUrl}">Activar mi cuenta y acceder a PCG</a></p>
            <p>Si el botón no funciona, copia y pega esta URL en tu navegador:</p>
            <p><a href="${acceptInviteUrl}">${acceptInviteUrl}</a></p>
            <p>Tu contraseña temporal es: <strong>${data.password}</strong></p>
            <p>Gracias,<br>El equipo de PCG</p>`,
      },
    });

    // 10. Respuesta a frontend
    return {
      uid,
      email: data.email,
      nombre: data.nombre,
      role: data.role,
      companyId: data.companyId,
    };
  }
);
