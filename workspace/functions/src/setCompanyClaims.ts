
// workspace/functions/src/setCompanyClaims.ts
import * as functions from "firebase-functions";
import { getAdminApp } from "./firebaseAdmin";

const adminApp = getAdminApp();
const auth = adminApp.auth();

export const setCompanyClaims = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Debes estar autenticado.");
    }
    const requester = await auth.getUser(context.auth.uid);
    if (requester.customClaims?.role !== "superadmin") {
      throw new functions.https.HttpsError("permission-denied", "Solo SUPER_ADMIN puede asignar claims.");
    }
    
    const { uid, role, companyId, subcontractorId } = data || {};
    
    if (!uid || !role || !companyId) {
      throw new functions.https.HttpsError("invalid-argument", "Debes proporcionar uid, role y companyId.");
    }

    try {
      const claims: Record<string, any> = {
        role,
        companyId,
      };

      // Solo añadir subcontractorId si se proporciona y el rol es 'contratista'
      if (role === 'contratista' && subcontractorId) {
        claims.subcontractorId = subcontractorId;
      }
      
      await auth.setCustomUserClaims(uid, claims);
      
      // Actualizar también el documento en Firestore para consistencia
      const userDocRef = adminApp.firestore().collection('users').doc(uid);
      await userDocRef.set({
        role,
        empresaId: companyId,
        subcontractorId: claims.subcontractorId || null,
      }, { merge: true });


      return {
        status: "ok",
        message: `Claims asignados correctamente al usuario ${uid}.`,
        claimsSet: claims,
      };
    } catch (error: any) {
      throw new functions.https.HttpsError("internal", "Error al asignar los claims.", error.message);
    }
  });
