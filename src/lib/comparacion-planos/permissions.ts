import admin from "@/server/firebaseAdmin";
import { AppUser, Company } from "@/types/pcg";

const db = admin.firestore();

export async function canUserAccessCompany(user: AppUser | null, companyId: string) {
  if (!user) return false;
  if (user.role === "superadmin") return true;
  return user.companyId === companyId;
}

export async function getCompany(companyId: string): Promise<Company | null> {
  const snap = await db.collection("companies").doc(companyId).get();
  return snap.exists ? (snap.data() as Company) : null;
}

export function canUseComparacionPlanos(user: AppUser | null): boolean {
  if (!user) return false;
  return (
    user.role === "superadmin" ||
    user.permissions?.includes("comparacion-planos")
  );
}
