// src/app/api/test-google-ai/route.ts
import { NextResponse } from "next/server";
import { ai } from "@/genkit";

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json({ ok: false, error: "Prompt es requerido." }, { status: 400 });
        }

        const response = await ai.generate({
            model: 'googleai/gemini-2.0-flash',
            prompt: prompt,
        });

        return NextResponse.json({ ok: true, text: response.text });

    } catch (e: any) {
        console.error("[API /test-google-ai] Error:", e);
        return NextResponse.json({ ok: false, error: e.message || "Error desconocido al contactar la IA." }, { status: 500 });
    }
}
