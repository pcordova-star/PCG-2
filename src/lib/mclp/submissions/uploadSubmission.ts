// src/lib/mclp/submissions/uploadSubmission.ts
import { firebaseDb, firebaseStorage } from "@/lib/firebaseClient";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, addDoc, setDoc, collection, query, where, serverTimestamp, getDocs } from "firebase/firestore";

type UploadParams = {
  companyId: string;
  periodId: string; // companyId_YYYY-MM
  period: string;   // YYYY-MM
  subcontractorId: string;
  requirementId: string;
  nombreDocumentoSnapshot: string;
  file: File;
  uid: string;
  comentario?: string;
};

export async function uploadDocumentSubmission(params: UploadParams) {
  // La validación de que el módulo está activo se hará en el componente que llama a esta función.
  
  const periodRef = doc(firebaseDb, "compliancePeriods", params.periodId);
  const periodSnap = await getDoc(periodRef);

  if (!periodSnap.exists()) throw new Error("PERIOD_NOT_FOUND");
  if (periodSnap.data().estado !== "Abierto para Carga") {
    throw new Error("PERIOD_NOT_OPEN");
  }

  const submissionsRef = collection(periodRef, "submissions");
  const q = query(
      submissionsRef,
      where("subcontractorId", "==", params.subcontractorId),
      where("requirementId", "==", params.requirementId)
  );

  const querySnapshot = await getDocs(q);
  let existingDocId: string | null = null;
  if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      if (doc.data().estado !== 'Observado') {
          throw new Error("No se puede reemplazar un documento que no está en estado 'Observado'.");
      }
      existingDocId = doc.id;
  }

  // Storage upload (Client-side)
  const storagePath = `mclp/${params.companyId}/${params.period}/${params.subcontractorId}/${params.requirementId}.pdf`;
  const storageRef = ref(firebaseStorage, storagePath);
  await uploadBytes(storageRef, params.file);
  const fileUrl = await getDownloadURL(storageRef);

  const submissionData = {
    subcontractorId: params.subcontractorId,
    requirementId: params.requirementId,
    nombreDocumentoSnapshot: params.nombreDocumentoSnapshot,
    fileUrl: fileUrl, // Usamos la URL HTTPS
    storagePath,
    fechaCarga: serverTimestamp(),
    cargadoPorUid: params.uid,
    estado: "Cargado",
    comentario: params.comentario || null,
    ultimaRevision: null,
  };
  
  if (existingDocId) {
    const docRef = doc(submissionsRef, existingDocId);
    await setDoc(docRef, submissionData, { merge: true });
    return { updated: true, submissionId: existingDocId };
  } else {
    const docRef = await addDoc(submissionsRef, submissionData);
    return { created: true, submissionId: docRef.id };
  }
}
