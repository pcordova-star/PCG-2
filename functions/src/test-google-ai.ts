// functions/src/test-google-ai.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { ai } from "./genkit-config";

export const testGoogleAi = onCall(
  {
    region: "southamerica-west1",
    secrets: ["GEMINI_API_KEY"],
  },
  async (request) => {
    const prompt = request.data?.prompt;

    if (!prompt || typeof prompt !== "string") {
      throw new HttpsError(
        "invalid-argument",
        'Formato requerido: {"data":{"prompt":"..."}}'
      );
    }

    // Diagnóstico de secret/env (SIN exponer la key)
    logger.info("GenAI env check", {
      hasGEMINI: !!process.env.GEMINI_API_KEY,
      geminiLen: process.env.GEMINI_API_KEY?.length ?? 0,
      hasGOOGLE: !!process.env.GOOGLE_API_KEY,
      googleLen: process.env.GOOGLE_API_KEY?.length ?? 0,
      hasAuth: !!request.auth,
      uid: request.auth?.uid ?? null,
    });

    try {
      // Nota: si el nombre del modelo no existe/está mal, esto va a tirar error y ahora lo veremos.
      const resp = await ai.generate({
        model: "googleai/gemini-2.5-flash",
        prompt,
      });

      const text =
        typeof (resp as any).text === "function"
          ? (resp as any).text()
          : (resp as any).text;

      return { ok: true, text: String(text ?? "") };
    } catch (e: any) {
      // Log REAL del error (esto es lo que hoy te falta)
      logger.error("Genkit call failed", {
        message: e?.message,
        name: e?.name,
        stack: e?.stack,
        cause: e?.cause,
      });

      throw new HttpsError("internal", "Genkit call failed", {
        message: e?.message ?? "unknown",
        name: e?.name ?? "unknown",
      });
    }
  }
);
