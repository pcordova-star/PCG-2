// src/app/api/comparacion-planos/upload/route.ts
// Este endpoint es reemplazado por /create, pero se deja por si hay referencias.
// La lógica principal estará en /create para unificar la creación del Job y la subida.
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Please use /api/comparacion-planos/create.' },
    { status: 410 }
  );
}
