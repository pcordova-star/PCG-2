// src/app/api/comparacion-planos/route.ts
// Este archivo queda obsoleto con el nuevo sistema de Jobs.
// El nuevo punto de entrada es /api/comparacion-planos/create/route.ts
// Lo mantenemos vacío por ahora para evitar errores 404 si algo aún lo llama,
// pero su lógica ha sido migrada.

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    return NextResponse.json(
        { error: 'This endpoint is deprecated. Please use /api/comparacion-planos/create.' },
        { status: 410 }
    );
}
