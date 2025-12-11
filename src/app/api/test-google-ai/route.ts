import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        status: 0,
        source: "env",
        body: { message: "GEMINI_API_KEY no está definida en el servidor." }
      },
      { status: 500 }
    );
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest?key=${apiKey}`;

    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    const body = await res.json();

    return NextResponse.json(
      {
        ok: res.ok,
        status: res.status,
        source: "google-ai-api",
        body
      },
      { status: res.status }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        status: 0,
        source: "network",
        body: { message: err.message }
      },
      { status: 500 }
    );
  }
}
