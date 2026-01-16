// src/lib/comparacion-planos/permissions.ts
import { getAdminApp } from "@/server/firebaseAdmin";
import { AppUser, Company } from "@/types/pcg";

const db = getAdminApp().firestore();

const ALLOWED_ROLES = ["admin_empresa", "superadmin", "jefe_obra"];

export async function canUseComparacionPlanos(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }

  try {
    const userDocRef = db.collection("users").doc(userId);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists) {
      console.warn(`[Permissions] User document not found for userId: ${userId}`);
      return false;
    }

    const userData = userDocSnap.data() as AppUser;

    if (userData.role === "superadmin") {
      return true; // Superadmin always has access.
    }
    
    if (!userData.empresaId) {
      console.warn(`[Permissions] No companyId associated with userId: ${userId}`);
      return false;
    }

    if (!ALLOWED_ROLES.includes(userData.role)) {
      return false;
    }

    const companyDocRef = db.collection("companies").doc(userData.empresaId);
    const companyDocSnap = await companyDocRef.get();

    if (!companyDocSnap.exists) {
      console.warn(`[Permissions] Company document not found for companyId: ${userData.empresaId}`);
      return false;
    }

    const companyData = companyDocSnap.data() as Company;

    return companyData.feature_plan_comparison_enabled === true;

  } catch (error) {
    console.error("[Permissions] Error checking permissions for canUseComparacionPlanos:", error);
    return false;
  }
}
