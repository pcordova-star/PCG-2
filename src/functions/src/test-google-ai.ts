// src/functions/src/test-google-ai.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getInitializedGenkitAi } from "./genkit-config"; 
import { GEMINI_API_KEY_SECRET } from "./params";

export const testGoogleAi = onCall(
  {
    secrets: [GEMINI_API_KEY_SECRET],
  },
  async (request) => {
    try {
      const ai = getInitializedGenkitAi();
      const prompt = request.data?.prompt;

      if (!prompt || typeof prompt !== "string") {
        throw new HttpsError(
          "invalid-argument",
          'Formato requerido: {"prompt":"..."}'
        );
      }

      logger.info("GenAI env check (runtime)", {
        hasAuth: !!request.auth,
        uid: request.auth?.uid ?? null,
      });

      const resp = await ai.generate({
        model: "googleai/gemini-1.5-flash-latest",
        prompt,
      });

      const text = resp.text();
      return { ok: true, text };
    } catch (e: any) {
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
