// This file is obsolete. The logic has been moved to a Storage-triggered Cloud Function.
// It is kept to avoid 404 errors but should not be used.

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    return NextResponse.json({ error: 'This endpoint is deprecated.' }, { status: 410 });
}

export async function POST(req: Request) {
    return NextResponse.json({ error: 'This endpoint is deprecated. Use direct upload to Storage.' }, { status: 410 });
}
