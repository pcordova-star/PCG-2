// src/app/api/comparacion-planos/estado/[jobId]/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { jobId: string } }) {
  // TODO: implementar estado del job
  return NextResponse.json({ message: "estado endpoint placeholder", jobId: params.jobId });
}
