// src/functions/src/test-google-ai.ts
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import { getInitializedGenkitAi } from "./genkit-config"; 

// Using v1 onCall function
export const testGoogleAi = functions.region("southamerica-west1")
  .runWith({ secrets: ["GEMINI_API_KEY"] })
  .https.onCall(async (data, context) => {
    try {
      const ai = getInitializedGenkitAi();
      const prompt = data.prompt;

      if (!prompt || typeof prompt !== "string") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          'Formato requerido: {"prompt":"..."}'
        );
      }
      
      logger.info("GenAI env check (runtime)", {
        hasAuth: !!context.auth,
        uid: context.auth?.uid ?? null,
      });

      const resp = await ai.generate({
        model: "googleai/gemini-1.5-flash-latest",
        prompt,
      });

      const text = resp.text;
      return { ok: true, text };

    } catch (e: any) {
      logger.error("Genkit call failed", {
        message: e?.message,
        name: e?.name,
        stack: e?.stack,
        cause: e?.cause,
      });
      throw new functions.https.HttpsError("internal", `Genkit call failed: ${e.message}`);
    }
  });
