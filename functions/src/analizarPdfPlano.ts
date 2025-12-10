// functions/src/analizarPdfPlano.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import { createCanvas } from "canvas";

// Necesario para que pdfjs funcione en Node
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("pdfjs-dist/legacy/build/pdf.worker.js");

const apiKey = process.env.GEMINI_API_KEY;

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const analizarPdfPlano = onCall(
  {
    region: "southamerica-west1",
    cors: true, // onCall maneja CORS automáticamente
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "El usuario debe estar autenticado para analizar planos."
      );
    }
    
    if (!genAI) {
      throw new HttpsError(
        "internal",
        "La API de IA no está configurada (falta GEMINI_API_KEY)."
      );
    }

    const { fileUrl, prompt } = request.data ?? {};

    if (!fileUrl || typeof fileUrl !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "fileUrl es obligatorio."
      );
    }

    const effectivePrompt: string =
      typeof prompt === "string" && prompt.trim().length > 0
        ? prompt
        : "Analiza este plano en PDF y entrega un resumen de recintos, superficies y posibles inconsistencias.";

    try {
      const downloadRes = await fetch(fileUrl);
      if (!downloadRes.ok) {
        throw new Error(
          `No se pudo descargar el PDF desde fileUrl. Status: ${downloadRes.status}`
        );
      }

      const pdfArrayBuffer = await downloadRes.arrayBuffer();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const loadingTask = (pdfjsLib as any).getDocument({
        data: pdfArrayBuffer,
      });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const viewport = page.getViewport({ scale: 2 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d");

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      const pngBuffer = canvas.toBuffer("image/png");
      const base64Data = pngBuffer.toString("base64");

      const model = genAI.getGenerativeModel({
        model: "gemini-pro-vision",
      });

      const result = await model.generateContent([
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/png",
          },
        },
        { text: effectivePrompt },
      ]);

      const response = await result.response;
      const text = response.text();

      return {
        ok: true,
        analysis: text,
      };
    } catch (error: any) {
      logger.error("Error en analizarPdfPlano:", error);
      throw new HttpsError(
        "internal",
        "Ocurrió un error al analizar el plano en PDF.",
        error?.message ?? String(error)
      );
    }
  }
);
