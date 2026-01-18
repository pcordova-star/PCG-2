// functions/src/test-google-ai.ts
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";

export const testGoogleAi = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    const prompt = data?.prompt;

    if (!prompt || typeof prompt !== "string") {
      throw new functions.https.HttpsError("invalid-argument", 'Formato requerido: {"data":{"prompt":"..."}}');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error("GEMINI_API_KEY no está configurada en el servidor.");
      throw new functions.https.HttpsError("internal", "La clave de API de Gemini no está configurada en el servidor.");
    }
    
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
    };

    try {
      logger.info("[testGoogleAi] Enviando solicitud a Gemini...");
      const response = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        logger.error("Error desde la API de Gemini:", errorBody);
        throw new Error(`Error de la API de Gemini: ${errorBody.error?.message || response.statusText}`);
      }
      
      const responseData = await response.json();
      const text = responseData.candidates[0]?.content?.parts[0]?.text;

      logger.info("[testGoogleAi] Solicitud exitosa.");
      return { ok: true, text: text || "Respuesta vacía del modelo." };

    } catch (e: any) {
      logger.error("Llamada a la API de Gemini falló:", e);
      throw new functions.https.HttpsError("internal", `Llamada a la API de Gemini falló: ${e.message}`);
    }
  });
