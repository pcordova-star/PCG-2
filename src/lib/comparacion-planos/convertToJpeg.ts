// src/lib/comparacion-planos/convertToJpeg.ts
"use client";

import type { PDFDocumentProxy } from 'pdfjs-dist';

const MAX_DIMENSION = 1600;
const JPG_QUALITY = 0.8;

async function getPdfjs() {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    return pdfjsLib;
}

async function fileToJpegFile(file: File): Promise<File> {
    const pdfjs = await getPdfjs();
    const arrayBuffer = await file.arrayBuffer();

    const pdf: PDFDocumentProxy = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1); // Solo la primera página

    const viewport = page.getViewport({ scale: 1.0 });
    const scale = Math.min(MAX_DIMENSION / viewport.width, MAX_DIMENSION / viewport.height, 1);
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("El contexto del canvas no está disponible para la conversión.");
    }

    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: context, viewport: scaledViewport }).promise;

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error("No se pudo crear el blob desde el canvas."));
                    return;
                }
                const jpegFile = new File([blob], file.name.replace(/\.pdf$/i, ".jpg"), { type: "image/jpeg" });
                resolve(jpegFile);
            },
            "image/jpeg",
            JPG_QUALITY
        );
    });
}

/**
 * Procesa un archivo antes de subirlo. Si es un PDF, lo convierte a JPEG.
 * Si es una imagen, la devuelve tal cual.
 * @param file El archivo a procesar.
 * @returns Una promesa que resuelve al archivo procesado (posiblemente convertido).
 */
export async function processFileBeforeUpload(file: File): Promise<File> {
    if (file.type === 'application/pdf') {
        return fileToJpegFile(file);
    }
    // Si ya es una imagen (jpg, png), la devuelve directamente.
    return file;
}
