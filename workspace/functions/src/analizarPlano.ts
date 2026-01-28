// workspace/functions/src/analizarPlano.ts
import * as functions from "firebase-functions";
import fetch from "node-fetch";

// Nota: No necesitamos getAdminApp aquí si no usamos Firestore, 
// pero si lo usas en otros lados, déjalo importado.

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

    // 2. VALIDACIÓN FLEXIBLE (Aceptamos JPG, PNG, WEBP, etc.)
    if (
      !data ||
      typeof data.photoDataUri !== "string" ||
      !data.photoDataUri.startsWith("data:image/")
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El archivo enviado no es una imagen válida (debe iniciar con data:image/)."
      );
    }

    // 3. Tu API KEY (La que ya confirmamos que funciona)
    const apiKey = "AIzaSyDsRbRMKMJ7UQ6CKRdJY6LjeiVyoG1vlkU"; 

    // 4. PROCESAMIENTO INTELIGENTE DEL BASE64
    // Detectamos automáticamente si es png, jpeg o webp
    const matches = data.photoDataUri.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Formato de imagen corrupto o no reconocido."
        );
    }

    const mimeType = matches[1]; // Ej: "image/png" o "image/jpeg"
    const base64Data = matches[2]; // Los datos de la imagen

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType, // <--- AQUÍ USAMOS EL TIPO REAL, NO FORZAMOS JPEG
                data: base64Data,
              },
            },
            // Agregamos el prompt para que sepa qué hacer con la imagen
            {
                text: "Analiza este plano de construcción. Identifica los recintos, muros y elementos principales. Dame un resumen técnico."
            }
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

      // Validación extra por si Gemini devuelve error
      if (json.error) {
        console.error("Error de Gemini:", json.error);
        throw new Error(json.error.message || "Error en la IA de Google");
      }

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
