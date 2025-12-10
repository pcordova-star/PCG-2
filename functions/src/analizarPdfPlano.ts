import { onRequest } from "firebase-functions/v2/https";
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

export const analizarPdfPlano = onRequest(
  {
    region: "southamerica-west1",
    cors: true,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed. Use POST." });
      return;
    }

    try {
      if (!genAI) {
        res.status(500).json({
          error: "La API de IA no está configurada (falta GEMINI_API_KEY).",
        });
        return;
      }

      const { fileUrl, prompt } = req.body ?? {};

      if (!fileUrl || typeof fileUrl !== "string") {
        res.status(400).json({ error: "fileUrl es obligatorio en el body." });
        return;
      }

      const effectivePrompt: string =
        typeof prompt === "string" && prompt.trim().length > 0
          ? prompt
          : "Analiza este plano en PDF y entrega un resumen de recintos, superficies y posibles inconsistencias.";

      // 1) Descargar PDF desde Storage usando la URL pública
      const downloadRes = await fetch(fileUrl);
      if (!downloadRes.ok) {
        throw new Error(
          `No se pudo descargar el PDF desde fileUrl. Status: ${downloadRes.status}`
        );
      }

      const pdfArrayBuffer = await downloadRes.arrayBuffer();

      // 2) Cargar PDF con pdfjs y renderizar la primera página a un canvas
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

      // 3) Convertir canvas a PNG base64
      const pngBuffer = canvas.toBuffer("image/png");
      const base64Data = pngBuffer.toString("base64");

      // 4) Enviar imagen a Gemini Pro Vision
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

      res.status(200).json({
        ok: true,
        analysis: text,
      });
    } catch (error: any) {
      logger.error("Error en analizarPdfPlano:", error);
      res.status(500).json({
        error: "Ocurrió un error al analizar el plano en PDF.",
        detail: error?.message ?? String(error),
      });
    }
  }
);
