// src/app/api/comparacion-planos/create/route.ts
// This endpoint is deprecated. The logic has been moved to /api/comparacion-planos/upload/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    return NextResponse.json(
        { error: 'This endpoint is deprecated. Please use /api/comparacion-planos/upload.' },
        { status: 410 }
    );
}

export async function GET() {
    return NextResponse.json({ error: 'Método no permitido. Usa POST para crear un trabajo.' }, { status: 405 });
}
