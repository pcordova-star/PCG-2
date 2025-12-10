// src/app/api/analizar-plano/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AnalisisPlanoInput, AnalisisPlanoOutput } from "@/types/analisis-planos";

function parseDataUri(dataUri: string): { mimeType: string; base64Data: string } {
  const [meta, base64Data] = dataUri.split(",");
  const mimeMatch = meta.match(/data:(.*);base64/);
  const mimeType = mimeMatch?.[1] ?? "application/octet-stream";
  return { mimeType, base64Data };
}

const BASE_PROMPT = `
Eres un asistente experto en análisis de planos de construcción para constructoras. Tu tarea es interpretar un plano arquitectónico o de especialidades y extraer cubicaciones precisas según las opciones solicitadas por el usuario.

Debes seguir estas reglas estrictamente:

1. Analiza la imagen (plano) que se entrega como primer input del modelo.
2. Considera las opciones del usuario (opcionesSeleccionadas).
3. Usa las notas del usuario (notasUsuario) para mejorar la precisión.
4. Tu respuesta DEBE ser SOLO un JSON válido, sin texto adicional, que siga exactamente este esquema:

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

No incluyas bloques de código, ni texto explicativo, ni backticks. Solo el JSON.

Define:
- "type": valores como "recinto", "muro", "losa", "revestimiento", "instalaciones hidráulicas", "instalaciones eléctricas", etc.
- "unit": usa "m²", "m³", "m", "unidad" según corresponda.
- "confidence": valor entre 0 y 1.
- "notes": explica supuestos (altura de muro, calidad del plano, descuentos de vanos, etc.).

`;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalisisPlanoInput;
    const { photoDataUri, opcionesSeleccionadas, notasUsuario, obraId } = body;

    if (!photoDataUri) {
      return NextResponse.json(
        { error: "photoDataUri es requerido" },
        { status: 400 }
      );
    }

    const { mimeType, base64Data } = parseDataUri(photoDataUri);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Falta GEMINI_API_KEY en variables de entorno");
      return NextResponse.json(
        { error: "Falta configuración del modelo de IA" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
${BASE_PROMPT}

Opciones solicitadas: ${JSON.stringify(opcionesSeleccionadas)}
Notas del usuario: ${notasUsuario || "Sin notas adicionales."}
ID de obra (para contexto, no para mostrar): ${obraId}
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

    const text = result.response.text();

    let parsed: AnalisisPlanoOutput;
    try {
      parsed = JSON.parse(text) as AnalisisPlanoOutput;
    } catch (err) {
      console.error("Respuesta de IA no es JSON válido:", text);
      throw new Error("La IA no devolvió un JSON válido.");
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Error en /api/analizar-plano:", error);
    return NextResponse.json(
      { error: "Error interno en el análisis de planos" },
      { status: 500 }
    );
  }
}
