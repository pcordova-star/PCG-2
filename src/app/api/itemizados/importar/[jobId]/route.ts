import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: { jobId: string } }) {
  const jobIdFromParams = ctx?.params?.jobId;
  const jobIdFromUrl = new URL(req.url).pathname.split("/").pop();
  const jobId = jobIdFromParams || jobIdFromUrl;

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
