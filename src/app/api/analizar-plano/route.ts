// src/app/api/analizar-plano/route.ts
import { NextResponse } from "next/server";
import admin from "@/server/firebaseAdmin";
import axios from "axios";

// Helper para limpiar JSON que puede venir con formato markdown
function cleanJsonString(rawString: string): string {
    let cleaned = rawString.replace(/```json/g, "").replace(/```/g, "");
    const startIndex = cleaned.indexOf("{");
    const endIndex = cleaned.lastIndexOf("}");
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        console.error("Respuesta de IA no contenía un objeto JSON válido.", { rawString });
        return `{"summary": "Error: La IA no generó una respuesta JSON válida. Intente con una imagen más clara o un plano menos denso.", "elements": []}`;
    }
    return cleaned.substring(startIndex, endIndex + 1);
}


export async function POST(req: Request) {
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
        return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }
    const token = authorization.split("Bearer ")[1];
    await admin.auth().verifyIdToken(token);

    const body = await req.json();
    const { photoDataUri, opciones, notas } = body;

    if (!photoDataUri || typeof photoDataUri !== "string" || !opciones) {
        return NextResponse.json({ error: 'Faltan la imagen o las opciones de análisis.' }, { status: 400 });
    }
    
    const API_KEY = process.env.GOOGLE_GENAI_API_KEY;
    if (!API_KEY) {
        console.error("La variable de entorno GOOGLE_GENAI_API_KEY no está configurada.");
        return NextResponse.json({ error: 'Falta configuración de API Key en el servidor.' }, { status: 500 });
    }
    
    const opcionesSeleccionadas = Object.entries(opciones)
      .filter(([, value]) => value)
      .map(([key]) => `- ${key}`)
      .join('\n');

    const prompt = `
Eres un experto analista de cubicaciones de construcción. Tu tarea es analizar un plano y extraer las cantidades según las opciones seleccionadas por el usuario.

Opciones de análisis seleccionadas:
${opcionesSeleccionadas || "Ninguna opción específica seleccionada, realiza un análisis general."}

Notas adicionales del usuario (úsalas como guía, especialmente para escalas o alturas):
${notas || "Sin notas."}

Analiza la imagen del plano adjunto y devuelve tu análisis EXCLUSIVAMENTE en formato JSON. La estructura del JSON debe ser:
{
  "summary": "Un resumen conciso y técnico de lo que pudiste analizar basado en las opciones. Incluye cualquier supuesto clave que hayas hecho (ej. escala, altura).",
  "elements": [
    {
      "type": "tipo de elemento (ej: 'Superficie Útil', 'Muro', 'Losa')",
      "name": "nombre o descripción (ej: 'Living Comedor', 'Muro exterior', 'Losa Nivel 2')",
      "unit": "unidad de medida (ej: 'm²', 'm³', 'ml', 'u')",
      "estimatedQuantity": <número>,
      "confidence": <número de 0 a 1>,
      "notes": "aclaraciones o supuestos sobre esta partida específica"
    }
  ]
}

No incluyas texto adicional ni formato markdown fuera del JSON. Tu respuesta debe ser un JSON parseable directamente.
`;
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${API_KEY}`;
    const match = photoDataUri.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
        return NextResponse.json({ error: 'El formato del photoDataUri es inválido.' }, { status: 400 });
    }
    const mimeType = match[1];
    const base64Data = match[2];

    const response = await axios.post(URL, {
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }],
    });

    const resultado = response.data;
    const rawJson = (resultado as any).candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawJson) {
        throw new Error("La respuesta de Gemini no contiene texto JSON válido.");
    }

    const cleanedJson = cleanJsonString(rawJson);
    const parsedResult = JSON.parse(cleanedJson);

    return NextResponse.json({ result: parsedResult });

  } catch (err: any) {
    console.error("Error en /api/analizar-plano:", err);
    if (err.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Token de autenticación expirado.' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Error desconocido al analizar el plano" }, { status: 500 });
  }
}
