// src/app/api/mclp/submissions/review/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb, FieldValue } from "@/server/firebaseAdmin";
import { ensureMclpEnabled } from "@/server/lib/mclp/ensureMclpEnabled";
import { z } from 'zod';

export const runtime = "nodejs";

const ReviewSchema = z.object({
  companyId: z.string(),
  periodId: z.string(),
  submissionId: z.string(),
  decision: z.enum(['Aprobado', 'Observado']),
  comentario: z.string().optional().default(''),
});

async function updateOverallStatus(db: FirebaseFirestore.Firestore, companyId: string, periodId: string, subcontractorId: string) {
    const periodRef = db.collection("compliancePeriods").doc(periodId);
    const requirementsRef = db.collection("compliancePrograms").doc(companyId).collection("requirements");
    const submissionsRef = periodRef.collection("submissions");

    // Get all mandatory requirements
    const reqsSnap = await requirementsRef.where("esObligatorio", "==", true).get();
    const mandatoryReqIds = reqsSnap.docs.map(doc => doc.id);

    if (mandatoryReqIds.length === 0) {
        // If there are no mandatory documents, they comply by default.
        const statusDocRef = periodRef.collection("status").doc(subcontractorId);
        await statusDocRef.set({
            estado: 'Cumple',
            lastEvaluated: FieldValue.serverTimestamp(),
        }, { merge: true });
        return;
    }

    // Get all submissions for the subcontractor in this period
    const submsSnap = await submissionsRef.where("subcontractorId", "==", subcontractorId).get();
    const submissions = submsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const approvedMandatoryDocs = new Set(
        submissions.filter(s => s.estado === 'Aprobado' && mandatoryReqIds.includes(s.requirementId)).map(s => s.requirementId)
    );

    const newStatus = mandatoryReqIds.every(id => approvedMandatoryDocs.has(id))
        ? 'Cumple'
        : 'No Cumple';

    const statusDocRef = periodRef.collection("status").doc(subcontractorId);
    await statusDocRef.set({
        estado: newStatus,
        lastEvaluated: FieldValue.serverTimestamp(),
    }, { merge: true });
}

export async function POST(req: NextRequest) {
    try {
        const authorization = req.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authorization.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userRole = (decodedToken as any).role;

        if (userRole !== 'superadmin' && userRole !== 'admin_empresa') {
             return NextResponse.json({ error: 'Permission Denied' }, { status: 403 });
        }

        const body = await req.json();
        const parsed = ReviewSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
        }

        const { companyId, periodId, submissionId, decision, comentario } = parsed.data;

        await ensureMclpEnabled(companyId);

        const submissionRef = adminDb
            .collection("compliancePeriods").doc(periodId)
            .collection("submissions").doc(submissionId);
            
        const submissionSnap = await submissionRef.get();
        if (!submissionSnap.exists) {
             return NextResponse.json({ error: "Submission not found" }, { status: 404 });
        }
        
        const subcontractorId = submissionSnap.data()?.subcontractorId;
        
        const reviewData = {
            estado: decision,
            'revision.revisadoPorUid': decodedToken.uid,
            'revision.fecha': FieldValue.serverTimestamp(),
            'revision.decision': decision,
            'revision.comentario': comentario,
        };

        await submissionRef.update(reviewData);

        if (subcontractorId) {
            await updateOverallStatus(adminDb, companyId, periodId, subcontractorId);
        }

        return NextResponse.json({ success: true, submissionId });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
