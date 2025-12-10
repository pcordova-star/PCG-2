import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

function parseDataUri(
  dataUri: string
): { mimeType: string; base64Data: string } {
  const [meta, base64Data] = dataUri.split(",");
  const mimeMatch = meta.match(/data:(.*);base64/);
  const mimeType = mimeMatch?.[1] ?? "application/octet-stream";
  return { mimeType, base64Data };
}

const apiKey =
  process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(req: Request) {
  try {
    if (!genAI) {
      return NextResponse.json(
        {
          error:
            "La API de IA no está configurada (falta GEMINI_API_KEY o NEXT_PUBLIC_GEMINI_API_KEY).",
        },
        { status: 500 }
      );
    }

    const body = await req.json();

    // Esperamos un dataURL de imagen (PNG/JPG)
    const dataUrl: string | undefined =
      body.imageDataUrl || body.fileDataUrl || body.imageBase64;

    if (!dataUrl) {
      return NextResponse.json(
        { error: "No se recibió la imagen del plano." },
        { status: 400 }
      );
    }

    const { mimeType, base64Data } = parseDataUri(dataUrl);

    if (!mimeType.startsWith("image/")) {
      return NextResponse.json(
        {
          error:
            "Por ahora el análisis solo acepta imágenes (PNG/JPG). Si subes un PDF, conviértelo a imagen antes.",
        },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt: string =
      body.prompt ??
      "Analiza este plano de construcción y entrega un resumen de recintos, superficies y posibles inconsistencias.";

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    const text = response.text();

    return NextResponse.json(
      {
        ok: true,
        analysis: text,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error en /api/analizar-plano:", error);
    return NextResponse.json(
      {
        error: "Ocurrió un error durante el análisis del plano.",
        detail: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
