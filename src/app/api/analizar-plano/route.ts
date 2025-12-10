import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  AnalisisPlanoInput,
  AnalisisPlanoOutput,
} from "@/types/analisis-planos";

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import { createCanvas } from "canvas";

// Necesario para PDF en Node
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "pdfjs-dist/legacy/build/pdf.worker.js";

/**
 * Convierte un dataURI en MIME y base64
 */
function parseDataUri(
  dataUri: string
): { mimeType: string; base64Data: string } {
  const [meta, base64Data] = dataUri.split(",");
  const mimeMatch = meta.match(/data:(.*);base64/);
  const mimeType = mimeMatch?.[1] ?? "application/octet-stream";
  return { mimeType, base64Data };
}

/**
 * Extrae la primera página de un PDF y la convierte en imagen PNG (base64)
 */
async function pdfFirstPageToPngBase64(
  pdfBase64: string
): Promise<{ mimeType: string; base64Data: string }> {
  const pdfBuffer = Buffer.from(pdfBase64, "base64");

  const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 2 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  const pngBuffer = canvas.toBuffer("image/png");

  return {
    mimeType: "image/png",
    base64Data: pngBuffer.toString("base64"),
  };
}

const BASE_PROMPT = `
Eres un asistente experto en análisis de planos de construcción para constructoras.

Debes entregar únicamente un JSON válido con esta estructura exacta:

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

No incluyas texto fuera del JSON. No uses backticks. No expliques nada fuera del JSON.
`;

/**
 * Endpoint principal
 */
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

    // Si es PDF → convertir a PNG
    if (mimeType === "application/pdf") {
      try {
        const converted = await pdfFirstPageToPngBase64(base64Data);
        mimeType = converted.mimeType;
        base64Data = converted.base64Data;
      } catch (err) {
        console.error("Error al convertir PDF:", err);
        return NextResponse.json(
          { error: "No se pudo procesar el PDF. Intenta con un archivo más liviano." },
          { status: 500 }
        );
      }
    }

    // Validamos formato imagen
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Formato no soportado. Sube JPG, PNG o PDF válido." },
        { status: 400 }
      );
    }

    // Validar API KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Falta GEMINI_API_KEY en variables de entorno");
      return NextResponse.json(
        { error: "Falta configuración del modelo de IA" },
        { status: 500 }
      );
    }

    // Crear cliente Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-pro-vision", // Modelo correcto para imagen + texto
    });

    const prompt = `
${BASE_PROMPT}

Opciones solicitadas: ${JSON.stringify(body.opcionesSeleccionadas)}
Notas del usuario: ${body.notasUsuario || "Sin notas adicionales"}
ID obra (solo contexto): ${body.obraId}
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

    // Limpiar posibles backticks
    const cleaned = rawText
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    let parsed: AnalisisPlanoOutput;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error("Respuesta inválida:", cleaned);
      return NextResponse.json(
        { error: "La IA no devolvió un JSON válido." },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Error en /api/analizar-plano:", error);
    return NextResponse.json(
      {
        error: error?.message || "Error interno en el análisis de planos",
      },
      { status: 500 }
    );
  }
}
