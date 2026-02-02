// workspace/functions/src/deactivateCompanyUser.ts
import * as functions from 'firebase-functions';
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { getAdminApp } from "./firebaseAdmin";

const adminApp = getAdminApp();

// Refactored to onCall for consistency and easier auth handling
export const deactivateCompanyUser = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    // 1. Check for authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "El usuario no está autenticado."
      );
    }

    const { uid: requesterUid } = context.auth;
    const requesterClaims = context.auth.token;
    const requesterRole = requesterClaims.role;

    // 2. Validate input data
    const { userId, motivo } = data;
    if (!userId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El ID del usuario a desactivar es requerido."
      );
    }
    
    const auth = adminApp.auth();
    const db = adminApp.firestore();

    // 3. Permission Check
    if (requesterRole !== "superadmin" && requesterRole !== "admin_empresa") {
       throw new functions.https.HttpsError(
        "permission-denied",
        "Permiso denegado. Se requiere rol de administrador."
      );
    }

    // 4. Scope Check (if admin_empresa)
    if (requesterRole === "admin_empresa") {
        const requesterCompanyId = requesterClaims.companyId;
        if (!requesterCompanyId) {
            throw new functions.https.HttpsError("permission-denied", "El administrador no tiene una empresa asociada.");
        }
        
        const targetUserSnap = await db.collection("users").doc(userId).get();
        if (!targetUserSnap.exists) {
            throw new functions.https.HttpsError("not-found", "El usuario a desactivar no fue encontrado.");
        }
        const targetUserData = targetUserSnap.data()!;

        // An admin can only deactivate users of their own company or subcontractors of their company.
        if (targetUserData.empresaId !== requesterCompanyId) {
             // Let's check if the user belongs to a subcontractor of the admin's company
             if (!targetUserData.subcontractorId) {
                 throw new functions.https.HttpsError("permission-denied", "No puedes gestionar usuarios de otra empresa.");
             }
             const subRef = await db.collection('subcontractors').doc(targetUserData.subcontractorId).get();
             if (!subRef.exists || subRef.data()?.companyId !== requesterCompanyId) {
                 throw new functions.https.HttpsError("permission-denied", "No puedes gestionar usuarios de un subcontratista de otra empresa.");
             }
        }
    }

    // 5. Deactivation Logic
    try {
        logger.info(`Iniciando desactivación para usuario ${userId} por ${requesterUid}`);

        await auth.updateUser(userId, { disabled: true });
        logger.info(`Usuario ${userId} deshabilitado en Firebase Auth.`);

        const userDocRef = db.collection("users").doc(userId);
        await userDocRef.update({
            activo: false,
            fechaBaja: admin.firestore.FieldValue.serverTimestamp(),
            motivoBaja: motivo || "Desactivado por administrador.",
            bajaPorUid: requesterUid,
        });
        logger.info(`Documento de usuario ${userId} marcado como inactivo en Firestore.`);
        
        await auth.revokeRefreshTokens(userId);
        logger.info(`Tokens de sesión para ${userId} revocados.`);
        
        return { success: true, message: `Usuario ${userId} ha sido desactivado.` };

    } catch (error: any) {
        logger.error(`Error al desactivar usuario ${userId}:`, error);
        throw new functions.https.HttpsError("internal", "Ocurrió un error interno al desactivar el usuario.", error.message);
    }
});
