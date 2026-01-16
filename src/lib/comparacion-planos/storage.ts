// src/lib/comparacion-planos/storage.ts
import { getAdminApp } from "@/server/firebaseAdmin";

const storage = getAdminApp().storage();

/**
 * Downloads a file from Firebase Storage and converts it to a Data URI.
 * @param storagePath The full path to the file in the bucket.
 * @returns A promise that resolves to the Data URI string.
 */
export async function getPlanoAsDataUri(storagePath: string): Promise<string> {
  const bucket = storage.bucket(); // default bucket
  const file = bucket.file(storagePath);

  // Primero, verificamos que el archivo exista para evitar errores de descarga.
  const [exists] = await file.exists();
  if (!exists) {
    throw new Error(`El archivo no se encontró en la ruta de Storage: ${storagePath}`);
  }

  const [metadata] = await file.getMetadata();
  const contentType = metadata.contentType || 'application/octet-stream';

  const [buffer] = await file.download();
  const base64 = buffer.toString('base64');
  
  return `data:${contentType};base64,${base64}`;
}
