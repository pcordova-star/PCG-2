import * as functions from "firebase-functions";
import axios from "axios";
import * as logger from "firebase-functions/logger";

export const analizarPlano = functions
  .region("us-central1")
  .runWith({ 
    timeoutSeconds: 300, 
    memory: "1GB",
    secrets: ["GOOGLE_GENAI_API_KEY"] 
  })
  .https.onCall(async (data, context) => {

    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión.");
    }

    const imagenBase64 = data.photoDataUri;
    if (!imagenBase64 || typeof imagenBase64 !== "string") {
       throw new functions.https.HttpsError("invalid-argument", "Falta la imagen.");
    }
    
    // La clave ahora se lee de forma segura desde el entorno de la función
    const API_KEY = process.env.GOOGLE_GENAI_API_KEY; 

    if (!API_KEY) {
        logger.error("La variable de entorno GOOGLE_GENAI_API_KEY no está configurada.");
        throw new functions.https.HttpsError("internal", "Falta configuración de API Key en el servidor.");
    }

    const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
    const cleanBase64 = imagenBase64.replace(/^data:image\/\w+;base64,/, "");

    try {
      logger.info("🚀 Enviando petición a Gemini con Axios...");

      const response = await axios.post(URL, {
        contents: [{
          parts: [
            { text: "Eres un experto en construcción. Analiza este plano arquitectónico. Enumera los recintos, identifica muros y elementos estructurales. Dame un resumen técnico preciso." },
            { inline_data: { mime_type: "image/jpeg", data: cleanBase64 } }
          ]
        }]
      });

      const resultado = response.data;
      
      const texto = (resultado as any).candidates?.[0]?.content?.parts?.[0]?.text;

      return {
        success: true,
        data: texto || "Sin respuesta legible."
      };

    } catch (err) {
      const errorAny = err as any;
      logger.error("Error Gemini:", errorAny.message);
      if (errorAny.response?.data) {
        logger.error("Error response data:", JSON.stringify(errorAny.response.data));
      }
      throw new functions.https.HttpsError("internal", errorAny.message || "Error al procesar");
    }
});
