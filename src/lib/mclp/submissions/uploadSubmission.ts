// src/lib/mclp/submissions/uploadSubmission.ts
import { getAdminDb, getAdminStorage } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { ensureMclpEnabled } from "../ensureMclpEnabled";

type UploadParams = {
  companyId: string;
  periodId: string; // companyId_YYYY-MM
  period: string;   // YYYY-MM
  subcontractorId: string;
  requirementId: string;
  nombreDocumentoSnapshot: string;
  fileBuffer: Buffer;
  mimeType: string;
  uid: string;
};

export async function uploadDocumentSubmission(params: UploadParams) {
  await ensureMclpEnabled(params.companyId);

  const db = getAdminDb();
  const periodRef = db.collection("compliancePeriods").doc(params.periodId);
  const periodSnap = await periodRef.get();

  if (!periodSnap.exists) throw new Error("PERIOD_NOT_FOUND");
  if (periodSnap.get("estado") !== "Abierto para Carga") {
    throw new Error("PERIOD_NOT_OPEN");
  }

  const submissionsRef = periodRef.collection("submissions");
  const query = await submissionsRef
    .where("subcontractorId", "==", params.subcontractorId)
    .where("requirementId", "==", params.requirementId)
    .limit(1)
    .get();

  let existingDocId: string | null = null;
  let existingState: string | null = null;

  if (!query.empty) {
    const d = query.docs[0];
    existingDocId = d.id;
    existingState = d.get("estado");
    if (existingState !== "Observado") {
      throw new Error("SUBMISSION_ALREADY_EXISTS");
    }
  }

  // Storage upload
  const storagePath = `mclp/${params.companyId}/${params.period}/${params.subcontractorId}/${params.requirementId}.pdf`;
  const bucket = getAdminStorage().bucket();
  const file = bucket.file(storagePath);

  await file.save(params.fileBuffer, {
    contentType: params.mimeType,
    resumable: false,
    metadata: {
      companyId: params.companyId,
      subcontractorId: params.subcontractorId,
      period: params.period,
      requirementId: params.requirementId,
    },
  });

  const submissionData = {
    subcontractorId: params.subcontractorId,
    requirementId: params.requirementId,
    nombreDocumentoSnapshot: params.nombreDocumentoSnapshot,
    fileUrl: `gs://${bucket.name}/${storagePath}`,
    storagePath,
    fechaCarga: Timestamp.now(),
    cargadoPorUid: params.uid,
    estado: "Cargado",
    ultimaRevision: null,
  };

  if (existingDocId) {
    await submissionsRef.doc(existingDocId).set(submissionData, { merge: true });
    return { updated: true, submissionId: existingDocId };
  }

  const ref = submissionsRef.doc();
  await ref.set(submissionData);
  return { created: true, submissionId: ref.id };
}
