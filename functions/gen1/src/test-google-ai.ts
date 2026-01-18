// functions/src/test-google-ai.ts
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import { getInitializedGenkitAi } from "./genkit-config";

export const testGoogleAi = functions.region("southamerica-west1")
  .runWith({ secrets: ["GEMINI_API_KEY"] })
  .https.onCall(async (data, context) => {
    const prompt = data?.prompt;

    if (!prompt || typeof prompt !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        'Formato requerido: {"data":{"prompt":"..."}}'
      );
    }

    logger.info("GenAI env check", {
      hasGEMINI: !!process.env.GEMINI_API_KEY,
      geminiLen: process.env.GEMINI_API_KEY?.length ?? 0,
      hasAuth: !!context.auth,
      uid: context.auth?.uid ?? null,
    });

    try {
      const ai = getInitializedGenkitAi();
      const resp = await ai.generate({
        model: "googleai/gemini-1.5-flash",
        prompt,
      });

      const text = typeof (resp as any).text === "function"
          ? (resp as any).text()
          : (resp as any).text;

      return { ok: true, text: String(text ?? "") };
    } catch (e: any) {
      logger.error("Genkit call failed", {
        message: e?.message,
        name: e?.name,
        stack: e?.stack,
        cause: e?.cause,
      });

      throw new functions.https.HttpsError("internal", "Genkit call failed", {
        message: e?.message ?? "unknown",
        name: e?.name ?? "unknown",
      });
    }
  });
