// src/app/(pcg)/operaciones/presupuestos/itemizados/importar/actions.ts
'use server';

import admin from '@/server/firebaseAdmin';

export async function iniciarImportacionAction(formData: FormData) {
  const db = admin.firestore();
  
  const obraId = formData.get('obraId') as string;
  const obraNombre = formData.get('obraNombre') as string;
  const notas = formData.get('notas') as string;
  const pdfFile = formData.get('pdfFile') as File | null;
  
  if (!pdfFile || !obraId || !obraNombre) {
    return { error: "Faltan datos requeridos (obra o archivo)." };
  }

  try {
    const buffer = await pdfFile.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');
    const pdfDataUri = `data:application/pdf;base64,${base64Data}`;

    const newJobDoc = {
      status: "queued",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      obraId,
      obraNombre,
      notas: notas || "",
      pdfDataUri,
      sourceFileName: pdfFile.name,
    };

    const docRef = await db.collection("itemizadoImportJobs").add(newJobDoc);
    
    return { jobId: docRef.id };

  } catch (error: any) {
    console.error("[iniciarImportacionAction] Error:", error);
    return {
      error: "Error interno del servidor al iniciar el trabajo de importación.",
    };
  }
}
