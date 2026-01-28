// workspace/functions/src/analizarPlano.ts
import * as functions from "firebase-functions";
import fetch from "node-fetch"; // Asegúrate de tener instalado node-fetch v2 si usas CommonJS o v3 si usas módulos

export const analizarPlano = functions
  .region("us-central1")
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .https.onCall(async (data, context) => {

    // 1. Verificación de seguridad (Auth)
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Debe estar autenticado."
      );
    }

    // 2. VALIDACIÓN FLEXIBLE
    if (
      !data ||
      typeof data.photoDataUri !== "string" ||
      !data.photoDataUri.startsWith("data:image/")
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El archivo enviado no es una imagen válida."
      );
    }

    // 3. API KEY
    // Lo ideal es usar process.env.GEMINI_API_KEY configurada en Firebase
    const apiKey = "AIzaSyDsRbRMKMJ7UQ6CKRdJY6LjeiVyoG1vlkU"; 

    // 4. PROCESAMIENTO DEL BASE64
    const matches = data.photoDataUri.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Formato de imagen corrupto o no reconocido."
        );
    }

    const mimeType = matches[1]; 
    const base64Data = matches[2]; 

    // Estructura del Body para Gemini
    const requestBody = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType, 
                data: base64Data,
              },
            },
            {
              text: "Analiza este plano de construcción. Identifica los recintos, muros y elementos principales. Dame un resumen técnico detallado."
            }
          ],
        },
      ],
    };

    // --- CAMBIO IMPORTANTE AQUÍ ---
    // Usamos gemini-pro-vision que es el modelo correcto para el endpoint v1beta multimodal
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const json = await response.json();

      // Validación de error de la API
      if (json.error) {
        console.error("Error detallado de Gemini:", JSON.stringify(json.error, null, 2));
        throw new Error(json.error.message || "Error desconocido en la IA");
      }

      // Extracción segura de la respuesta
      const output =
        json?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No se obtuvo respuesta de análisis.";

      return {
        status: "ok",
        analysis: output,
      };

    } catch (err: any) {
      console.error("Error al llamar a Gemini:", err);
      throw new functions.https.HttpsError(
        "internal",
        "Error procesando el plano con IA.",
        err.message
      );
    }
  });
