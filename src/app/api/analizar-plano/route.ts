// src/app/api/analizar-plano/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ----------------- Helpers -----------------

async function fetchFileAsBase64(
  fileUrl: string
): Promise<{ mimeType: string; base64Data: string }> {
  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error(
      `No se pudo descargar el archivo desde Storage. Status: ${res.status}`
    );
  }

  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Data = buffer.toString("base64");

  return { mimeType: contentType, base64Data };
}

// ----------------- Gemini -----------------

const apiKey =
  process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// ----------------- Handler -----------------

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

    const body: any = await req.json();

    const fileUrl: string | undefined = body.fileUrl;
    const fileType: string | undefined = body.fileType;
    const prompt: string =
      body.prompt ??
      "Analiza este plano de construcción y entrega un resumen de recintos, superficies y posibles inconsistencias.";

    if (!fileUrl || !fileType) {
      return NextResponse.json(
        {
          error:
            "Faltan datos del archivo. Se requiere fileUrl y fileType en el body.",
        },
        { status: 400 }
      );
    }

    // De momento SOLO soportamos imágenes.
    if (!fileType.startsWith("image/")) {
      return NextResponse.json(
        {
          error:
            "Por ahora este análisis solo acepta imágenes (PNG/JPG) ya subidas a Storage. Para PDFs grandes implementaremos una función dedicada.",
        },
        { status: 400 }
      );
    }

    // Descarga el archivo desde Storage y lo prepara como base64
    const { mimeType, base64Data } = await fetchFileAsBase64(fileUrl);

    if (!mimeType.startsWith("image/")) {
      return NextResponse.json(
        {
          error:
            "El archivo descargado desde Storage no es una imagen. Verifica que el plano se haya exportado como PNG/JPG.",
        },
        { status: 400 }
      );
    }

    // Modelo de imagen + texto compatible
    const model = genAI.getGenerativeModel({
      model: "gemini-pro-vision",
    });

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
