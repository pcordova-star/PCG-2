// src/app/api/analizar-plano/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  AnalisisPlanoInput,
  AnalisisPlanoOutput,
} from "@/types/analisis-planos";

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import { createCanvas } from "canvas";

// Necesario para que pdfjs funcione en Node
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "pdfjs-dist/legacy/build/pdf.worker.js";

function parseDataUri(
  dataUri: string
): { mimeType: string; base64Data: string } {
  const [meta, base64Data] = dataUri.split(",");
  const mimeMatch = meta.match(/data:(.*);base64/);
  const mimeType = mimeMatch?.[1] ?? "application/octet-stream";
  return { mimeType, base64Data };
}

// Convierte la primera página de un PDF (base64) a PNG (base64)
async function pdfFirstPageToPngBase64(
  pdfBase64: string
): Promise<{ mimeType: string; base64Data: string }> {
  const pdfBuffer = Buffer.from(pdfBase64, "base64");

  const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1); // primera página

  const viewport = page.getViewport({ scale: 2 }); // escala 2x para mejor resolución
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");

  const renderContext = {
    canvasContext: context,
    viewport,
  };

  await page.render(renderContext).promise;

  const pngBuffer = canvas.toBuffer("image/png");
  const base64Data = pngBuffer.toString("base64");

  return { mimeType: "image/png", base64Data };
}

const BASE_PROMPT = `
Eres un asistente experto en análisis de planos de construcción para constructoras. Tu tarea es interpretar un plano arquitectónico o de especialidades y extraer cubicaciones precisas según las opciones solicitadas por el usuario.

Debes seguir estas reglas estrictamente:

1. Analiza la imagen (plano) que se entrega como primer input del modelo.
2. Considera las opciones del usuario (opcionesSeleccionadas).
3. Usa las notas del usuario (notasUsuario) para mejorar la precisión.
4. Tu respuesta DEBE ser SOLO un JSON válido, sin texto adicional ni backticks, que siga exactamente este esquema:

{
  "summary": "string",
  "elements": [
    {
      "type": "string",
      "name": "string",
      "unit": "string",
      "estimatedQuantity": number,
      "confidence": number,
      "notes": "string"
    }
  ]
}

- "type": valores como "recinto", "muro", "losa", "revestimiento", "instalaciones hidráulicas", "instalaciones eléctricas", etc.
- "unit": usa "m²", "m³", "m", "unidad" según corresponda.
- "confidence": valor entre 0 y 1.
- "notes": explica supuestos (altura de muro, calidad del plano, descuentos de vanos, etc.).

No expliques nada fuera de ese JSON.
`;

// Endpoint que corre en Vercel (Node). No usa Genkit ni flows.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalisisPlanoInput;

    if (!body?.photoDataUri) {
      return NextResponse.json(
        { error: "photoDataUri es requerido" },
        { status: 400 }
      );
    }

    let { mimeType, base64Data } = parseDataUri(body.photoDataUri);

    // Si es PDF, convertimos la primera página a PNG
    if (mimeType === "application/pdf") {
      try {
        const converted = await pdfFirstPageToPngBase64(base64Data);
        mimeType = converted.mimeType;
        base64Data = converted.base64Data;
      } catch (err) {
        console.error("Error al convertir PDF a imagen:", err);
        return NextResponse.json(
          {
            error:
              "No se pudo procesar el PDF. Intenta con un archivo más liviano o una imagen del plano.",
          },
          { status: 500 }
        );
      }
    }

    // Validamos que ahora tengamos una imagen
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json(
        {
          error:
            "Formato de archivo no soportado. Sube una imagen (JPG, PNG) o un PDF válido.",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Falta GEMINI_API_KEY en variables de entorno");
      return NextResponse.json(
        { error: "Falta configuración del modelo de IA" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Modelo soportado por tu API key para imagen + texto
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    const prompt = `
${BASE_PROMPT}

Opciones solicitadas: ${JSON.stringify(body.opcionesSeleccionadas)}
Notas del usuario: ${body.notasUsuario || "Sin notas adicionales."}
ID de obra (solo contexto, no es necesario mostrarlo): ${body.obraId}
`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
      { text: prompt },
    ]);

    const rawText = result.response.text().trim();
    console.log("Gemini raw response:", rawText);

    let cleaned = rawText;
    cleaned = cleaned
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    let parsed: AnalisisPlanoOutput;
    try {
      parsed = JSON.parse(cleaned) as AnalisisPlanoOutput;
    } catch (err) {
      console.error("No se pudo parsear la respuesta de IA como JSON:", cleaned);
      throw new Error("La IA no devolvió un JSON válido.");
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Error en /api/analizar-plano:", error);
    const message =
      error?.message || "Error interno en el análisis de planos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
