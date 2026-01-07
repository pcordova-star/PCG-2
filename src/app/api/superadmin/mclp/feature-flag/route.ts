// src/app/api/superadmin/mclp/feature-flag/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/server/firebaseAdmin";
import { withSuperadminAuth } from "@/lib/auth/requireSuperadmin";

async function handler(req: NextRequest) {
  const { companyId, enabled } = await req.json();
  
  if (typeof enabled !== "boolean" || !companyId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = getAdminDb();
  await db.collection("companies").doc(companyId).set(
    { feature_compliance_module_enabled: enabled },
    { merge: true }
  );

  return NextResponse.json({ ok: true, message: `Módulo de Cumplimiento ${enabled ? 'habilitado' : 'deshabilitado'} para la empresa ${companyId}.` });
}

export const POST = withSuperadminAuth(handler);
