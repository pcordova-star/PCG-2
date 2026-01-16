// src/app/api/comparacion-planos/estado/[jobId]/route.ts
// Placeholder para la API que consulta el estado del job.
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { jobId: string } }) {
  return NextResponse.json({ jobId: params.jobId, status: "pending" });
}
