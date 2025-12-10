// src/app/api/analizar-plano/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  AnalisisPlanoInput,
  AnalisisPlanoOutput,
} from "@/types/analisis-planos";

function parseDataUri(
  dataUri: string
): { mimeType: string; base64Data: string } {
  const [meta, base64Data] = dataUri.split(",");
  const mimeMatch = meta.match(/data:(.*);base64/);
  const mimeType = mimeMatch?.[1] ?? "application/octet-stream";
  return { mimeType, base64Data };
}

const BASE_PROMPT = `
Eres un asistente experto en análisis de planos de construcción para constructoras. Tu tarea es interpretar un plano arquitectónico o de especialidades y extraer cubicaciones según las opciones solicitadas por el usuario.

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

    const { mimeType, base64Data } = parseDataUri(body.photoDataUri);

    // Esta versión simplificada solo acepta imágenes.
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json(
        {
          error:
            "Por ahora, solo se pueden analizar imágenes (JPG, PNG). Por favor, convierte tu PDF a una imagen y vuelve a intentarlo.",
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
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
