// src/lib/pdf/pdfToImage.ts
"use client";

import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

export interface PdfToImageResult {
  dataUrl: string;
  pageCount: number;
}

/**
 * Convierte una página específica de un archivo PDF a un data URL de imagen.
 * Importa dinámicamente pdfjs-dist para evitar problemas de SSR.
 * @param file El archivo PDF.
 * @param pageNumber El número de página a convertir (1-indexado).
 * @param scale La escala de renderizado (mayor escala = mayor resolución).
 * @returns Una promesa que resuelve a un objeto con el dataUrl de la imagen y el total de páginas.
 */
export async function pdfPageToDataUrl(
  file: File,
  pageNumber: number,
  scale = 1.5
): Promise<PdfToImageResult> {
  const pdfjsLib = await import('pdfjs-dist');
  
  // Configurar la ruta del worker. Es crucial para que pdf.js funcione en el navegador.
  // El archivo debe estar en la carpeta `public` de Next.js.
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  
  const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  if (pageNumber < 1 || pageNumber > pdf.numPages) {
    throw new Error(`Número de página inválido. El PDF tiene ${pdf.numPages} páginas.`);
  }

  const page: PDFPageProxy = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  
  // Crear un canvas temporal para renderizar la página
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  
  if (!context) {
    throw new Error("No se pudo obtener el contexto del canvas.");
  }
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  await page.render(renderContext).promise;
  
  // Convertir el canvas a data URL. JPEG es más eficiente en tamaño para fotos/planos.
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

  return {
    dataUrl,
    pageCount: pdf.numPages
  };
}