// src/lib/image/compressDataUrlJpeg.ts
export async function compressDataUrlJpeg(
  dataUrl: string,
  opts?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0.6–0.85 recomendado
  }
): Promise<string> {
  const maxWidth = opts?.maxWidth ?? 2200;
  const maxHeight = opts?.maxHeight ?? 2200;
  const quality = opts?.quality ?? 0.82;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      const scale = Math.min(
        maxWidth / width,
        maxHeight / height,
        1 // nunca escalar hacia arriba
      );

      width = Math.floor(width * scale);
      height = Math.floor(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No se pudo obtener el contexto del canvas para la compresión."));

      // Fondo blanco (evita transparencias raras al convertir a JPEG)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0, width, height);

      const compressed = canvas.toDataURL("image/jpeg", quality);
      resolve(compressed);
    };

    img.onerror = (err) => {
        console.error("Error al cargar la imagen para compresión", err);
        reject(new Error("No se pudo cargar la imagen generada para la optimización."));
    };
    img.src = dataUrl;
  });
}
