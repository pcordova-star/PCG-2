import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Convierte un dataURL a { mimeType, base64Data }
function parseDataUri(
  dataUri: string
): { mimeType: string; base64Data: string } {
  const [meta, base64Data] = dataUri.split(",");
  const mimeMatch = meta.match(/data:(.*);base64/);
  const mimeType = mimeMatch?.[1] ?? "application/octet-stream";
  return { mimeType, base64Data };
}

// Obtiene la API Key
const apiKey =
  process.env.GEMINI_API_KEY ??
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ??
  "";

// Inicializa la API
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) :
