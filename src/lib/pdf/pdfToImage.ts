{// src/lib/pdf/pdfToImage.ts
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";
import "pdfjs-dist/build/pdf.worker.mjs";

// Set worker source. This is crucial for it to work with bundlers like Webpack/Next.js
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

const DEFAULT_SCALE = 1.8;

export async function convertPdfToImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ dataUrl: string; width: number; height: number }> {
  const uri = URL.createObjectURL(file);
  onProgress?.(5);

  try {
    const pdf = await pdfjsLib.getDocument(uri).promise;
    onProgress?.(30);

    const page = await pdf.getPage(1);
    onProgress?.(50);

    const viewport = page.getViewport({ scale: DEFAULT_SCALE });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not get canvas context");
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;
    onProgress?.(70);

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
    onProgress?.(90);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onProgress?.(100);

    return { dataUrl, width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(uri);
  }
}
