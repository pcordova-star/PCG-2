// src/app/api/mclp/subcontractors/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/server/firebaseAdmin";
import { ensureMclpEnabled } from "@/server/lib/mclp/ensureMclpEnabled";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";

// GET /api/mclp/subcontractors?companyId=[ID]
export async function GET(req: NextRequest) {
  try {
    const companyId = req.nextUrl.searchParams.get("companyId");
    if (!companyId) {
      return NextResponse.json({ error: "companyId es requerido" }, { status: 400 });
    }
    
    await ensureMclpEnabled(adminDb, companyId);
    
    const snap = await adminDb
      .collection("subcontractors")
      .where("companyId", "==", companyId)
      .where("activo", "==", true)
      .get();
      
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/mclp/subcontractors (to create)
export async function POST(req: NextRequest) {
  try {
    const { companyId, razonSocial, rut, contactoNombre, contactoEmail } = await req.json();
    if (!companyId || !razonSocial || !rut || !contactoNombre || !contactoEmail) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }
    
    await ensureMclpEnabled(adminDb, companyId);
    const ref = adminDb.collection("subcontractors").doc();
    
    await ref.set({
      companyId,
      razonSocial,
      rut,
      contactoPrincipal: {
        nombre: contactoNombre,
        email: contactoEmail,
      },
      activo: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    return NextResponse.json({ success: true, id: ref.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/mclp/subcontractors?companyId=[ID]&subcontractorId=[ID] (to deactivate)
export async function DELETE(req: NextRequest) {
    try {
        const companyId = req.nextUrl.searchParams.get("companyId");
        const subcontractorId = req.nextUrl.searchParams.get("subcontractorId");
        
        if (!companyId || !subcontractorId) {
            return NextResponse.json({ error: "companyId y subcontractorId son requeridos" }, { status: 400 });
        }
        
        await ensureMclpEnabled(adminDb, companyId);
        
        await adminDb.collection("subcontractors").doc(subcontractorId).update({
            activo: false,
            updatedAt: Timestamp.now(),
        });
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
