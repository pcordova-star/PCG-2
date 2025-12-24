import { NextResponse } from "next/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const runtime = "nodejs";

function getAdminDb() {
  if (!getApps().length) initializeApp();
  return getFirestore();
}

type GetParams = {
  params: { jobId: string };
};

export async function GET(_: Request, { params }: GetParams) {
  const jobId = params?.jobId;

  if (!jobId) {
    return NextResponse.json({ error: "jobId es requerido" }, { status: 400 });
  }

  try {
    const snap = await getAdminDb()
      .collection("itemizadoImportJobs")
      .doc(jobId)
      .get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Trabajo no encontrado" }, { status: 404 });
    }

    const jobData = snap.data() || {};

    return NextResponse.json(
      {
        status: jobData.status,
        result: jobData.status === "done" ? jobData.result : null,
        error: jobData.status === "error" ? jobData.errorMessage : null,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("GET itemizadoImportJobs status error:", e);
    return NextResponse.json(
      { error: "Error interno del servidor al consultar el trabajo." },
      { status: 500 }
    );
  }
}
