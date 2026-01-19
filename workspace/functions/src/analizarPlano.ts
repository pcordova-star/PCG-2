// workspace/functions/src/analizarPlano.ts
import * as functions from "firebase-functions";
import { getAdminApp } from "./firebaseAdmin";
import fetch from "node-fetch";

const adminApp = getAdminApp();

export const analizarPlano = functions
  .region("us-central1")
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .https.onCall(async (data, context) => {

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Debe estar autenticado."
      );
    }

    if (
      !data ||
      typeof data.photoDataUri !== "string" ||
      !data.photoDataUri.startsWith("data:image/jpeg;base64,")
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Debe enviar photoDataUri en formato JPEG base64."
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError(
        "internal",
        "GEMINI_API_KEY no configurada."
      );
    }

    const base64 = data.photoDataUri.split(",")[1];

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64,
              },
            },
          ],
        },
      ],
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const json = await response.json();

      const output =
        json?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No se obtuvo respuesta de análisis.";

      return {
        status: "ok",
        analysis: output,
      };
    } catch (err: any) {
      console.error("Error llamar a Gemini:", err);
      throw new functions.https.HttpsError(
        "internal",
        "Error llamando a Gemini.",
        err.message
      );
    }
  });
