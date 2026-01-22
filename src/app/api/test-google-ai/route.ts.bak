// src/app/api/test-google-ai/route.ts
import { NextResponse } from "next/server";
import { ai } from "@/server/genkit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = body?.prompt;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: 'Formato requerido: {"prompt":"..."}' },
        { status: 400 }
      );
    }
    
    console.log("[api/test-google-ai] Executing Genkit...");
    const resp = await ai.generate({
      model: "googleai/gemini-1.5-flash",
      prompt,
    });
    
    const text = resp.text;
    console.log("[api/test-google-ai] Model response:", text);

    return NextResponse.json({ ok: true, text });

  } catch (e: any) {
    console.error("[api/test-google-ai] Genkit call failed:", {
      message: e?.message,
      name: e?.name,
      stack: e?.stack,
      cause: e?.cause,
    });

    return NextResponse.json(
      { ok: false, error: "Genkit call failed", details: { message: e?.message ?? "unknown" } },
      { status: 500 }
    );
  }
}
