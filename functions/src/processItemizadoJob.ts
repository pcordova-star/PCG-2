// functions/src/processItemizadoJob.ts
import * as functions from "firebase-functions";
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

    logger.info(`[${jobId}] Job triggered`, { path: snapshot.ref.path });

    if (jobData.status !== "queued") {
      logger.warn(`[${jobId}] Job not queued. Ignoring.`);
      return;
    }

    // Cambiar estado a processing
    await jobRef.update({
      status: "processing",
      startedAt: adminApp.firestore.FieldValue.serverTimestamp(),
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error(`[${jobId}] Missing GEMINI_API_KEY`);
      await jobRef.update({
        status: "error",
        errorMessage: "GEMINI_API_KEY no configurada en el servidor.",
      });
      return;
    }

    try {
      const { pdfDataUri, notas, sourceFileName } = jobData;

      if (!pdfDataUri) throw new Error("pdfDataUri no encontrado.");

      const match = pdfDataUri.match(/^data:(application\/pdf);base64,(.*)$/);
      if (!match) {
        throw new Error("Formato pdfDataUri inválido. Se esperaba data:application/pdf;base64,...");
      }

      const mimeType = match[1];
      const base64Data = match[2];

      // PROMPT optimizado
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
        generationConfig: { response_mime_type: "application/json" },
      };

      const response = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`API Error: ${errorBody.error?.message || response.statusText}`);
      }

      const responseData: any = await response.json();
      const jsonText = responseData.candidates[0].content.parts[0].text;

      const parsed = JSON.parse(jsonText);

      await jobRef.update({
        status: "done",
        result: parsed,
        processedAt: adminApp.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`[${jobId}] Job procesado correctamente.`);

    } catch (err: any) {
      logger.error(`[${jobId}] ERROR:`, err);

      await jobRef.update({
        status: "error",
        errorMessage: err.message,
        processedAt: adminApp.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
