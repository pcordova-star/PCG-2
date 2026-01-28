// workspace/functions/src/processItemizadoJob.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { getAdminApp } from "./firebaseAdmin";
import fetch from "node-fetch";

const adminApp = getAdminApp();
const db = adminApp.firestore();

export const processItemizadoJob = functions
  .region("us-central1")
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .firestore.document("itemizadoImportJobs/{jobId}")
  .onCreate(async (snapshot, context) => {
    const { jobId } = context.params;
    const jobData = snapshot.data();
    const jobRef = snapshot.ref;

    logger.info(`[${jobId}] Job triggered`);    

    if (jobData.status !== "queued") {
      logger.warn(`[${jobId}] Not queued. Ignoring.`);
      return;
    }

    await jobRef.update({
      status: "processing",
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // --- CORRECCIÓN AQUÍ: Clave puesta directamente ("Hardcoded") ---
    const apiKey = "AIzaSyDsRbRMKMJ7UQ6CKRdJY6LjeiVyoG1vlkU";
    
    // Ya no necesitamos validar si existe porque la acabamos de escribir
    // if (!apiKey) { ... }

    try {
      const { pdfDataUri, notas, sourceFileName } = jobData;

      if (!pdfDataUri) throw new Error("pdfDataUri vacío.");

      const match = pdfDataUri.match(/^data:(application\/pdf);base64,(.*)$/);
      if (!match) throw new Error("Formato inválido: data:application/pdf;base64,...");

      const mimeType = match[1];
      const base64Data = match[2];

      const prompt = `
Eres un experto analista de itemizados de construcción.
Analiza el PDF entregado y genera un JSON válido siguiendo estas reglas:
- chapters[]: lista de capítulos principales detectados.
- rows[]:
  * type: "chapter" | "subchapter" | "item"
  * id: "1", "1.1", "1.1.1", etc.
  * parentId: id del contenedor superior o null.
  * chapterIndex: índice del capítulo.
  * codigo, descripcion, unidad, cantidad, precioUnitario, total: si no existe → null.
- meta.sourceFileName = "${sourceFileName || "N/A"}"
- No inventes valores.
Notas:
${notas || "Sin notas."}
Entrega SOLO un JSON válido, sin texto adicional.
`;

      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
        },
      };

      const response = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Error desconocido en API Gemini");
      }

      const result = await response.json();
      const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawJson) throw new Error("Gemini no retornó texto JSON.");

      const parsed = JSON.parse(rawJson);

      await jobRef.update({
        status: "done",
        result: parsed,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`[${jobId}] Job completado OK`);
    } catch (err: any) {
      logger.error(`[${jobId}] Error`, err);

      await jobRef.update({
        status: "error",
        errorMessage: err.message || "Error inesperado",
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });