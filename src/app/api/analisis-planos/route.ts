// This file is obsolete. The logic was moved to a Firebase Cloud Function
// to handle secrets securely. This file can be deleted.
import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json(
        { error: 'This endpoint is deprecated. Please use the "analizarPlano" Cloud Function.' },
        { status: 410 }
    );
}
